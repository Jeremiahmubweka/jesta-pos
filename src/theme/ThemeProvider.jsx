import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  DEFAULT_THEME,
  JESTA_THEMES,
  getTheme,
} from "./themes";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME);
  const [businessId, setBusinessId] = useState(null);
  const [loadingTheme, setLoadingTheme] = useState(true);

  const applyTheme = (selectedThemeId) => {
    const theme = getTheme(selectedThemeId);
    const root = document.documentElement;

    root.setAttribute("data-jesta-theme", theme.id);

    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--jesta-${key}`, value);
    });

    /*
     * Compatibility variables for the existing
     * 9,691-line JESTA App.css design system.
     */
    root.style.setProperty(
      "--jesta-primary-dark",
      theme.colors.primaryHover
    );

    root.style.setProperty(
      "--jesta-primary-light",
      theme.colors.primaryLight
    );

    root.style.setProperty(
      "--jesta-bg",
      theme.colors.background
    );

    root.style.setProperty(
      "--jesta-surface-soft",
      theme.colors.primaryLight
    );

    root.style.setProperty(
      "--jesta-text-secondary",
      theme.colors.textMuted
    );

    root.style.setProperty(
      "--jesta-sidebar-hover",
      theme.colors.secondary
    );
  };

  const loadTheme = async () => {
    try {
      setLoadingTheme(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setBusinessId(null);
        setThemeId(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("user_profiles")
        .select("business_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile?.business_id) {
        console.error(
          "Unable to determine user's business:",
          profileError
        );

        setBusinessId(null);
        setThemeId(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);
        return;
      }

      setBusinessId(profile.business_id);

      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id, theme")
        .eq("id", profile.business_id)
        .maybeSingle();

      if (businessError || !business) {
        console.error(
          "Unable to load business theme:",
          businessError
        );

        setThemeId(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);
        return;
      }

      const selectedTheme =
        business.theme || DEFAULT_THEME;

      setThemeId(selectedTheme);
      applyTheme(selectedTheme);
    } catch (error) {
      console.error(
        "Theme loading error:",
        error
      );

      setThemeId(DEFAULT_THEME);
      applyTheme(DEFAULT_THEME);
    } finally {
      setLoadingTheme(false);
    }
  };

  useEffect(() => {
    loadTheme();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "USER_UPDATED"
        ) {
          await loadTheme();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const changeTheme = async (newThemeId) => {
    if (!JESTA_THEMES[newThemeId]) {
      return {
        success: false,
        error: "Invalid theme selected.",
      };
    }

    if (!businessId) {
      return {
        success: false,
        error: "Business could not be identified.",
      };
    }

    const previousTheme = themeId;

    try {
      /*
       * Apply immediately so the admin sees
       * the new theme without refreshing.
       */
      setThemeId(newThemeId);
      applyTheme(newThemeId);

      /*
       * Secure database update.
       * The Supabase function verifies that
       * the logged-in user is an administrator.
       */
      const { data, error } = await supabase.rpc(
        "update_my_business_theme",
        {
          p_theme: newThemeId,
        }
      );

      if (error) {
        throw error;
      }

      if (data !== newThemeId) {
        throw new Error(
          "Theme was not saved correctly."
        );
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "Error saving JESTA theme:",
        error
      );

      /*
       * Roll back the visual theme if
       * the database update fails.
       */
      setThemeId(previousTheme);
      applyTheme(previousTheme);

      return {
        success: false,
        error:
          error.message ||
          "Failed to save theme.",
      };
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        theme: getTheme(themeId),
        themes: JESTA_THEMES,
        changeTheme,
        businessId,
        loadingTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}