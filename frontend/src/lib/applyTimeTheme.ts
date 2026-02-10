// src/lib/applyTimeTheme.ts
export function applyTimeTheme() {
  const h = new Date().getHours();
  const theme =
    h >= 5 && h < 10 ? "morning" :
    h >= 10 && h < 17 ? "day" :
    h >= 17 && h < 19 ? "evening" :
    "night";

  document.body.dataset.theme = theme;
}
