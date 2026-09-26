export const JESTA_THEMES = {
  "jesta-original": {
    id: "jesta-original",
    name: "JESTA Original",
    description: "The official JESTA POS theme",

    colors: {
      primary: "#2563EB",
      primaryHover: "#1D4ED8",
      primaryLight: "#EFF6FF",

      secondary: "#0F172A",

      accent: "#F59E0B",

      background: "#F8FAFC",
      surface: "#FFFFFF",
      border: "#E2E8F0",

      text: "#0F172A",
      textMuted: "#64748B",

      success: "#16A34A",
      danger: "#DC2626",
      warning: "#F59E0B",

      sidebar: "#0F172A",
      sidebarText: "#CBD5E1",
      sidebarActive: "#2563EB",
    },
  },

  "ocean-blue": {
    id: "ocean-blue",
    name: "Ocean Blue",
    description: "Clean and professional blue",

    colors: {
      primary: "#0284C7",
      primaryHover: "#0369A1",
      primaryLight: "#E0F2FE",

      secondary: "#082F49",

      accent: "#06B6D4",

      background: "#F0F9FF",
      surface: "#FFFFFF",
      border: "#BAE6FD",

      text: "#0C4A6E",
      textMuted: "#64748B",

      success: "#16A34A",
      danger: "#DC2626",
      warning: "#F59E0B",

      sidebar: "#082F49",
      sidebarText: "#BAE6FD",
      sidebarActive: "#0284C7",
    },
  },

  emerald: {
    id: "emerald",
    name: "Emerald",
    description: "Fresh and energetic green",

    colors: {
      primary: "#059669",
      primaryHover: "#047857",
      primaryLight: "#ECFDF5",

      secondary: "#064E3B",

      accent: "#10B981",

      background: "#F0FDF4",
      surface: "#FFFFFF",
      border: "#BBF7D0",

      text: "#064E3B",
      textMuted: "#64748B",

      success: "#16A34A",
      danger: "#DC2626",
      warning: "#F59E0B",

      sidebar: "#064E3B",
      sidebarText: "#A7F3D0",
      sidebarActive: "#059669",
    },
  },

  "royal-purple": {
    id: "royal-purple",
    name: "Royal Purple",
    description: "Modern premium purple",

    colors: {
      primary: "#7C3AED",
      primaryHover: "#6D28D9",
      primaryLight: "#F5F3FF",

      secondary: "#2E1065",

      accent: "#A855F7",

      background: "#FAF5FF",
      surface: "#FFFFFF",
      border: "#DDD6FE",

      text: "#2E1065",
      textMuted: "#64748B",

      success: "#16A34A",
      danger: "#DC2626",
      warning: "#F59E0B",

      sidebar: "#2E1065",
      sidebarText: "#DDD6FE",
      sidebarActive: "#7C3AED",
    },
  },

  sunset: {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange business theme",

    colors: {
      primary: "#EA580C",
      primaryHover: "#C2410C",
      primaryLight: "#FFF7ED",

      secondary: "#431407",

      accent: "#F97316",

      background: "#FFF7ED",
      surface: "#FFFFFF",
      border: "#FED7AA",

      text: "#431407",
      textMuted: "#78716C",

      success: "#16A34A",
      danger: "#DC2626",
      warning: "#F59E0B",

      sidebar: "#431407",
      sidebarText: "#FED7AA",
      sidebarActive: "#EA580C",
    },
  },
};

export const DEFAULT_THEME = "jesta-original";

export function getTheme(themeId) {
  return JESTA_THEMES[themeId] || JESTA_THEMES[DEFAULT_THEME];
}