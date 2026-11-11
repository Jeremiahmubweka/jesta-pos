
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  DEFAULT_THEME,
  JESTA_THEMES,
  getTheme,
} from "./themes";

import {
  getOfflineMetadata,
  saveOfflineMetadata,
} from "../lib/offline/database";

const ThemeContext = createContext(null);

function isNetworkError(error) {
  const message = String(
    error?.message || error || ""
  ).toLowerCase();

  return (
    navigator.onLine === false ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("load failed") ||
    message.includes("internet disconnected")
  );
}

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
     * JESTA App.css design system.
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

  const applyCachedTheme = async (userId) => {
    if (!userId) {
      return false;
    }

    try {
      const cachedTheme = await getOfflineMetadata(
        `jesta_theme_${userId}`
      );

      if (
        !cachedTheme ||
        cachedTheme.userId !== userId ||
        !cachedTheme.businessId
      ) {
        return false;
      }

      const selectedTheme =
        JESTA_THEMES[cachedTheme.themeId]
          ? cachedTheme.themeId
          : DEFAULT_THEME;

      setBusinessId(cachedTheme.businessId);
      setThemeId(selectedTheme);
      applyTheme(selectedTheme);

      return true;
    } catch (error) {
      console.error(
        "Unable to restore cached JESTA theme:",
        error
      );

      return false;
    }
  };

  const loadTheme = async () => {
    try {
      setLoadingTheme(true);

      /*
       * getSession reads the locally stored
       * Supabase session. Unlike getUser(),
       * it does not require server verification.
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setBusinessId(null);
        setThemeId(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);
        return;
      }

      const user = session.user;

      /*
       * If disconnected, restore the previously
       * cached business and theme.
       */
      if (navigator.onLine === false) {
        const restored = await applyCachedTheme(user.id);

        if (!restored) {
          setBusinessId(null);
          setThemeId(DEFAULT_THEME);
          applyTheme(DEFAULT_THEME);
        }

        return;
      }

      /*
       * Retrieve the user's business from Supabase.
       */
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("user_profiles")
        .select("business_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        if (isNetworkError(profileError)) {
          const restored = await applyCachedTheme(user.id);

          if (!restored) {
            setBusinessId(null);
            setThemeId(DEFAULT_THEME);
            applyTheme(DEFAULT_THEME);
          }

          return;
        }

        console.error(
          "Unable to determine user's business:",
          profileError
        );

        setBusinessId(null);
        setThemeId(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);
        return;
      }

      if (!profile?.business_id) {
        setBusinessId(null);
        setThemeId(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);
        return;
      }

      /*
       * Retrieve the business theme.
       */
      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id, theme")
        .eq("id", profile.business_id)
        .maybeSingle();

      if (businessError) {
        if (isNetworkError(businessError)) {
          const restored = await applyCachedTheme(user.id);

          if (!restored) {
            setBusinessId(null);
            setThemeId(DEFAULT_THEME);
            applyTheme(DEFAULT_THEME);
          }

          return;
        }

        console.error(
          "Unable to load business theme:",
          businessError
        );

        setBusinessId(profile.business_id);
        setThemeId(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);
        return;
      }

      if (!business) {
        setBusinessId(profile.business_id);
        setThemeId(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);
        return;
      }

      const selectedTheme =
        JESTA_THEMES[business.theme]
          ? business.theme
          : DEFAULT_THEME;

      setBusinessId(profile.business_id);
      setThemeId(selectedTheme);
      applyTheme(selectedTheme);

      /*
       * Save the latest business and theme locally.
       * A caching failure must not interrupt normal
       * online operation.
       */
      try {
        await saveOfflineMetadata(
          `jesta_theme_${user.id}`,
          {
            userId: user.id,
            businessId: profile.business_id,
            themeId: selectedTheme,
          }
        );
      } catch (cacheError) {
        console.error(
          "Unable to cache JESTA theme:",
          cacheError
        );
      }
    } catch (error) {
      console.error(
        "Theme loading error:",
        error
      );

      /*
       * Try the locally cached theme if the
       * failure was caused by connectivity.
       */
      if (isNetworkError(error)) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          const restored = await applyCachedTheme(
            session?.user?.id
          );

          if (restored) {
            return;
          }
        } catch (cacheError) {
          console.error(
            "Offline theme restoration failed:",
            cacheError
          );
        }
      }

      setBusinessId(null);
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

    if (navigator.onLine === false) {
      return {
        success: false,
        error: "Connect to the internet to save a business theme.",
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
       * Supabase verifies the logged-in user's
       * administrator permissions.
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

      /*
       * Update the local theme cache after
       * the database confirms the change.
       */
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          await saveOfflineMetadata(
            `jesta_theme_${session.user.id}`,
            {
              userId: session.user.id,
              businessId,
              themeId: newThemeId,
            }
          );
        }
      } catch (cacheError) {
        console.error(
          "Unable to update cached theme:",
          cacheError
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
