import cfg from '../config/theme.json';
/** 'day' between dayStartHour (inclusive) and nightStartHour (exclusive) in the visitor's local time, else 'night'. */
export const themeFor = (date = new Date()) => { const h = date.getHours(); return h >= cfg.dayStartHour && h < cfg.nightStartHour ? 'day' : 'night'; };
export const currentTheme = () => document.documentElement.dataset.theme || themeFor();
export function applyTheme() {
  const t = themeFor(), el = document.documentElement;
  const changed = el.dataset.theme !== t;
  if (changed) el.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(el).getPropertyValue('--color-background').trim());   // browser UI colour comes from tokens.css (also on first run, in case the pre-paint script ran before the tag existed)
  if (changed) {
    window.dispatchEvent(new CustomEvent('top-theme', { detail: t }));
  }
  return t;
}
/** Re-check every 30 s and when the tab becomes visible, so the site changes at the configured hour without a manual switch. */
export function startThemeWatcher() {
  applyTheme();
  requestAnimationFrame(() => requestAnimationFrame(() => el().classList.add('theme-ready')));   // enable colour transitions only after first paint
  const id = setInterval(applyTheme, 30000);
  const vis = () => !document.hidden && applyTheme();
  document.addEventListener('visibilitychange', vis);
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
}
const el = () => document.documentElement;
