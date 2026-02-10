export type ThemeMode = "auto" | "morning" | "day" | "evening" | "night";

const KEY = "cm_theme_pref";

export function getThemePref(): ThemeMode {
  const v = localStorage.getItem(KEY);
  if (v === "auto" || v === "morning" || v === "day" || v === "evening" || v === "night") return v;
  return "auto";
}

export function setThemePref(mode: ThemeMode) {
  localStorage.setItem(KEY, mode);
}

/** 時間帯からテーマ名を決める（auto用） */
export function getTimeTheme(now = new Date()): Exclude<ThemeMode, "auto"> {
  const h = now.getHours();
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 17) return "day";
  if (h >= 17 && h < 19) return "evening";
  return "night";
}

/** ✅ 最終的に body に反映する関数（固定優先） */
export function applyThemeFromPref() {
  const pref = getThemePref();
  const theme = pref === "auto" ? getTimeTheme() : pref;
  document.body.dataset.theme = theme;
}
