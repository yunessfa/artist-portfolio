import type { ResolvedTheme, ThemeTokens } from "./types";

/*
 * THEME ENGINE
 * ============
 * The database stores a small palette (bg / surface / surface-2 / line / text /
 * muted / accent / accent-soft / on-accent / shadow) plus a seasonal accent
 * pair. The design system in `index.css`, however, consumes a much larger token
 * set (--surface-3, --line-strong, --text-2, --accent-hover, --shadow-lift,
 * --band, --ink, ...).
 *
 * Two bugs lived here before:
 *
 * 1. Every DB token was written as an inline custom property on <html>, which
 *    outranks `:root` in `index.css`. The tokens the DB did NOT have simply
 *    stayed at their design-system value, so half the palette came from the
 *    theme and half from the stylesheet — the result was the flat, washed-out,
 *    "everything is white" look, and colour changes in the admin Theme screen
 *    appeared to do nothing.
 * 2. Font, body-size and line-height tokens were also taken from the DB, where
 *    they still pointed at font families that are no longer bundled.
 *
 * The fix: derive the COMPLETE token set from the palette with real colour
 * math, block the tokens that would break locally hosted fonts, and build
 * tinted (accent-coloured) shadows and gradients so the UI has depth instead of
 * flat white.
 */

export const STORAGE = {
  template: "ap.template",
  mode: "ap.mode",
  season: "ap.season",
  autoSeason: "ap.autoSeason",
  autoMode: "ap.autoMode",
} as const;

/* ----------------------------------------------------------- colour math ---- */

type Rgb = { r: number; g: number; b: number };

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Accepts #rgb, #rrggbb, #rrggbbaa, rgb() and rgba(). */
function parseColor(input: string | null | undefined): Rgb | null {
  if (!input) return null;
  const value = String(input).trim();

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const expand =
      hex.length === 3 || hex.length === 4
        ? hex
            .slice(0, 3)
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.slice(0, 6);
    if (expand.length !== 6 || /[^0-9a-f]/i.test(expand)) return null;
    return {
      r: parseInt(expand.slice(0, 2), 16),
      g: parseInt(expand.slice(2, 4), 16),
      b: parseInt(expand.slice(4, 6), 16),
    };
  }

  const match = value.match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i,
  );
  if (match) {
    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
    };
  }
  return null;
}

const toHex = (c: Rgb) =>
  `#${[c.r, c.g, c.b]
    .map((n) => clamp(n).toString(16).padStart(2, "0"))
    .join("")}`;

const rgba = (c: Rgb, alpha: number) =>
  `rgba(${clamp(c.r)}, ${clamp(c.g)}, ${clamp(c.b)}, ${Number(alpha.toFixed(3))})`;

/** Linear blend: t = 0 keeps `a`, t = 1 returns `b`. */
const mix = (a: Rgb, b: Rgb, t: number): Rgb => ({
  r: a.r + (b.r - a.r) * t,
  g: a.g + (b.g - a.g) * t,
  b: a.b + (b.b - a.b) * t,
});

/** Perceived brightness (0 = black, 1 = white). */
const luminance = (c: Rgb) =>
  (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/* -------------------------------------------------------- token policy ---- */

/**
 * Typography tokens must never come from the database: the site now ships its
 * own local font files (Vazirmatn / IranYekanX) and the stored values still
 * name families that are not bundled, which is exactly what made headings fall
 * back to Tahoma and the layout jump.
 */
const BLOCKED_TOKENS = new Set([
  "--font-display",
  "--font-body",
  "--body-size",
  "--line-height",
  "--display-weight",
  "--heading-scale",
]);

/** Colour tokens are consumed by the derivation step, not written verbatim. */
const DERIVED_TOKENS = new Set([
  "--bg",
  "--surface",
  "--surface-2",
  "--line",
  "--text",
  "--muted",
  "--accent",
  "--accent-soft",
  "--on-accent",
  "--shadow",
]);

/* -------------------------------------------------------------- palette ---- */

type Palette = Record<string, string>;

/**
 * Builds the full design-system palette from the handful of colours a theme
 * stores. Everything the stylesheet needs is produced here, so a theme can
 * never leave half the interface on stale values.
 */
export function derivePalette(tokens: ThemeTokens): Palette {
  const read = (key: string) => (tokens[key] ? String(tokens[key]) : null);

  const bg = parseColor(read("--bg"));
  const text = parseColor(read("--text"));
  const accent = parseColor(read("--accent"));
  if (!bg || !text || !accent) return {};

  const dark = luminance(bg) < 0.45;
  const far = dark ? WHITE : BLACK;

  const surface = parseColor(read("--surface")) || mix(bg, far, 0.04);
  const surface2 = parseColor(read("--surface-2")) || mix(bg, text, 0.06);
  const surface3 = mix(surface2, text, dark ? 0.08 : 0.06);
  const line = parseColor(read("--line")) || mix(bg, text, 0.16);
  const lineStrong = mix(line, text, 0.3);
  const muted = parseColor(read("--muted")) || mix(text, bg, 0.42);
  const text2 = mix(text, bg, 0.22);
  const onAccent =
    parseColor(read("--on-accent")) ||
    (luminance(accent) > 0.55 ? mix(text, BLACK, 0.2) : WHITE);
  const accentSoft =
    parseColor(read("--accent-soft")) || mix(accent, bg, dark ? 0.84 : 0.88);
  const accentHover = dark ? mix(accent, WHITE, 0.16) : mix(accent, BLACK, 0.18);

  const season1 = parseColor(read("--season-1")) || accent;
  const season2 = parseColor(read("--season-2")) || mix(accent, far, 0.3);

  // Shadow base: the darkest ink of the palette, tinted toward the accent so
  // depth reads as coloured light rather than grey haze.
  const shadowInk = dark ? BLACK : mix(text, BLACK, 0.35);
  const shadowTint = mix(shadowInk, accent, 0.35);

  const storedShadow = read("--shadow");

  // Ink band: the dark editorial section used between light sections.
  const ink = dark ? mix(bg, BLACK, 0.4) : mix(text, BLACK, 0.15);
  const inkTint = mix(ink, accent, 0.14);

  return {
    "--bg": toHex(bg),
    "--surface": toHex(surface),
    "--surface-2": toHex(surface2),
    "--surface-3": toHex(surface3),
    "--line": read("--line")?.startsWith("rgba")
      ? String(read("--line"))
      : toHex(line),
    "--line-strong": toHex(lineStrong),
    "--text": toHex(text),
    "--text-2": toHex(text2),
    "--muted": read("--muted")?.startsWith("rgba")
      ? String(read("--muted"))
      : toHex(muted),
    "--accent": toHex(accent),
    "--accent-hover": toHex(accentHover),
    "--accent-soft": read("--accent-soft")?.startsWith("rgba")
      ? String(read("--accent-soft"))
      : toHex(accentSoft),
    "--accent-line": rgba(accent, dark ? 0.42 : 0.28),
    "--on-accent": toHex(onAccent),
    "--overlay": rgba(shadowInk, dark ? 0.72 : 0.62),

    /* seasonal accents, used by gradients and small marks */
    "--season-1": toHex(season1),
    "--season-2": toHex(season2),
    "--season-glow": rgba(season1, dark ? 0.3 : 0.22),

    /* tinted section bands — this is what stops the page being all-white */
    "--band": toHex(mix(bg, accent, dark ? 0.08 : 0.05)),
    "--band-2": toHex(mix(bg, season1, dark ? 0.1 : 0.07)),
    "--band-soft": toHex(mix(surface, accent, dark ? 0.1 : 0.045)),
    "--ink": toHex(inkTint),
    "--on-ink": toHex(dark ? text : mix(bg, WHITE, 0.4)),
    "--ink-muted": rgba(dark ? text : WHITE, 0.62),
    "--ink-line": rgba(dark ? WHITE : WHITE, 0.16),

    /* gradients */
    "--grad-accent": `linear-gradient(120deg, ${toHex(accent)}, ${toHex(season1)})`,
    "--grad-surface": `linear-gradient(180deg, ${toHex(surface)}, ${toHex(
      mix(surface, accent, dark ? 0.07 : 0.04),
    )})`,
    "--grad-hero": `radial-gradient(120% 90% at 78% 8%, ${rgba(
      accent,
      dark ? 0.22 : 0.14,
    )} 0%, transparent 62%), radial-gradient(90% 80% at 8% 92%, ${rgba(
      season1,
      dark ? 0.18 : 0.12,
    )} 0%, transparent 60%)`,
    "--grad-media": `linear-gradient(to top, ${rgba(shadowInk, 0.78)} 0%, ${rgba(
      shadowInk,
      0.12,
    )} 58%, transparent 100%)`,

    /* depth: coloured, layered, still restrained */
    "--shadow":
      storedShadow && storedShadow.includes("px")
        ? storedShadow
        : `0 1px 2px ${rgba(shadowInk, 0.06)}, 0 12px 28px -22px ${rgba(shadowTint, 0.32)}`,
    "--shadow-lift": `0 2px 4px ${rgba(shadowInk, 0.05)}, 0 26px 56px -30px ${rgba(
      shadowTint,
      0.42,
    )}, 0 8px 20px -18px ${rgba(accent, 0.3)}`,
    "--shadow-accent": `0 18px 44px -26px ${rgba(accent, dark ? 0.62 : 0.5)}`,
    "--shadow-inset": `inset 0 1px 0 ${rgba(dark ? WHITE : WHITE, dark ? 0.06 : 0.7)}`,
  };
}

/* ------------------------------------------------------------- applying ---- */

/**
 * Applies a resolved theme to the document. This is the ONLY place that writes
 * theme CSS variables, which is what makes switching instant, reload-free and
 * flash-free: we mutate custom properties on <html> instead of swapping
 * stylesheets.
 */
export function applyTheme(theme: ResolvedTheme | null | undefined): void {
  if (!theme || typeof document === "undefined") return;
  const root = document.documentElement;
  const style = root.style;
  const tokens = (theme.tokens || {}) as ThemeTokens;

  // 1. non-colour tokens the admin is allowed to tune (radius, spacing, ...)
  for (const [key, value] of Object.entries(tokens)) {
    if (value === null || value === undefined || value === "") continue;
    const name = key.startsWith("--") ? key : `--${key}`;
    if (BLOCKED_TOKENS.has(name) || DERIVED_TOKENS.has(name)) continue;
    if (name === "--season-1" || name === "--season-2") continue;
    style.setProperty(name, String(value));
  }

  // 2. the complete, internally consistent palette
  const palette = derivePalette(tokens);
  for (const [key, value] of Object.entries(palette)) {
    style.setProperty(key, value);
  }

  // 3. state attributes used by CSS and by the motion layer
  for (const [attr, value] of Object.entries(theme.dataAttributes || {})) {
    if (value) root.setAttribute(attr, value);
  }
  root.setAttribute("data-mode", theme.mode || "day");
  root.setAttribute("data-season", theme.season || "none");
  root.setAttribute("data-motion", theme.motion?.style || "elegant");
  root.setAttribute("data-card", theme.cardStyle || "soft");
  root.setAttribute("data-button", theme.buttonStyle || "soft");
  root.style.colorScheme =
    theme.colorScheme || (theme.mode === "night" ? "dark" : "light");

  // 4. motion intensity, exposed so CSS transitions scale with the theme
  style.setProperty("--anim-scale", String(theme.motion?.animationSpeed ?? 1));
  style.setProperty(
    "--parallax-scale",
    String(theme.motion?.parallaxIntensity ?? 1),
  );
  if (theme.motion?.easing) style.setProperty("--ease", theme.motion.easing);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", palette["--bg"] || "#f7f5f1");
}

/** Legacy `ci()`: 07:00–18:59 is day. */
export function detectMode(now = new Date()): "day" | "night" {
  const h = now.getHours();
  return h >= 7 && h < 19 ? "day" : "night";
}

/** Legacy `ii()`: MMDD windows, winter wraps the year boundary. */
export function detectSeason(now = new Date()): string {
  const code = (now.getMonth() + 1) * 100 + now.getDate();
  if (code >= 320 && code < 621) return "spring";
  if (code >= 621 && code < 923) return "summer";
  if (code >= 923 && code < 1221) return "autumn";
  return "winter";
}

export function readVisitorPrefs() {
  try {
    return {
      template: localStorage.getItem(STORAGE.template),
      mode: localStorage.getItem(STORAGE.mode),
      season: localStorage.getItem(STORAGE.season),
      autoMode: localStorage.getItem(STORAGE.autoMode) !== "0",
      autoSeason: localStorage.getItem(STORAGE.autoSeason) !== "0",
    };
  } catch {
    return {
      template: null,
      mode: null,
      season: null,
      autoMode: true,
      autoSeason: true,
    };
  }
}

export function writeVisitorPref(
  key: keyof typeof STORAGE,
  value: string | null,
) {
  try {
    if (value === null) localStorage.removeItem(STORAGE[key]);
    else localStorage.setItem(STORAGE[key], value);
  } catch {
    /* private mode */
  }
}
