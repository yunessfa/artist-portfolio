import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import {
  applyTheme,
  detectMode,
  detectSeason,
  readVisitorPrefs,
  writeVisitorPref,
} from "@/lib/theme";
import type {
  Artist,
  Artwork,
  Category,
  NavItem,
  Page,
  ResolvedTheme,
  Season,
  SiteSetting,
  SocialLink,
  ThemeSummary,
} from "@/lib/types";

/** Exact shape returned by GET /api/v1/bootstrap/. */
type BootstrapPayload = {
  settings: SiteSetting;
  artist: Artist | null;
  theme: ResolvedTheme;
  themes: ThemeSummary[];
  seasons: Season[];
  navigation: NavItem[];
  socials: SocialLink[];
  categories: Category[];
  stats: Array<{ id: number; value: string; suffix: string; label: string }>;
  mediums: Array<{ id: number; label: string; label_en: string }>;
  featured: Artwork[];
  home: Page | null;
};

type BootstrapState = {
  loading: boolean;
  error: string | null;
  data: BootstrapPayload | null;
  // convenience accessors
  site: SiteSetting | null;
  theme: ResolvedTheme | null;
  artist: Artist | null;
  nav: { header: NavItem[]; mobile: NavItem[]; footer: NavItem[] };
  // theme controls (no reload, no flash)
  setTemplate: (key: string) => Promise<void>;
  setMode: (mode: "day" | "night" | "auto") => Promise<void>;
  setSeason: (season: string | "auto") => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<BootstrapState | null>(null);

const EMPTY_NAV = { header: [], mobile: [], footer: [] };

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [theme, setTheme] = useState<ResolvedTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const prefs = readVisitorPrefs();
    const params: Record<string, unknown> = {};
    if (!prefs.autoMode && prefs.mode) params.mode = prefs.mode;
    if (!prefs.autoSeason && prefs.season) params.season = prefs.season;
    try {
      const payload = await api.get<BootstrapPayload>("/bootstrap/", params);
      setData(payload);

      // A visitor-selected template is resolved server-side so the tokens
      // always come from the database, never from a hardcoded copy.
      let resolved = payload.theme;
      if (
        prefs.template &&
        payload.theme.allowVisitorOverride &&
        prefs.template !== payload.theme.themeKey
      ) {
        try {
          resolved = await api.get<ResolvedTheme>(
            `/themes/${prefs.template}/preview/`,
            params,
          );
        } catch {
          /* theme was deleted – fall back to the active one */
          writeVisitorPref("template", null);
        }
      }
      setTheme(resolved);
      applyTheme(resolved);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Re-resolve the theme from the API for the given visitor overrides. */
  const resolve = useCallback(
    async (opts: {
      template?: string | null;
      mode?: string | null;
      season?: string | null;
    }) => {
      const prefs = readVisitorPrefs();
      const template =
        opts.template ?? prefs.template ?? theme?.themeKey ?? null;
      const mode =
        opts.mode !== undefined
          ? opts.mode
          : prefs.autoMode
            ? null
            : prefs.mode;
      const season =
        opts.season !== undefined
          ? opts.season
          : prefs.autoSeason
            ? null
            : prefs.season;
      const params: Record<string, unknown> = {};
      if (mode) params.mode = mode;
      if (season) params.season = season;

      const path = template ? `/themes/${template}/preview/` : "/theme/active/";
      try {
        const next = await api.get<ResolvedTheme>(path, params);
        setTheme(next);
        applyTheme(next);
      } catch {
        /* keep the current theme on failure – never blank the page */
      }
    },
    [theme?.themeKey],
  );

  const setTemplate = useCallback(
    async (key: string) => {
      writeVisitorPref("template", key);
      await resolve({ template: key });
    },
    [resolve],
  );

  const setMode = useCallback(
    async (mode: "day" | "night" | "auto") => {
      if (mode === "auto") {
        writeVisitorPref("autoMode", "1");
        writeVisitorPref("mode", null);
        await resolve({ mode: detectMode() });
        return;
      }
      writeVisitorPref("autoMode", "0");
      writeVisitorPref("mode", mode);
      await resolve({ mode });
    },
    [resolve],
  );

  const setSeason = useCallback(
    async (season: string | "auto") => {
      if (season === "auto") {
        writeVisitorPref("autoSeason", "1");
        writeVisitorPref("season", null);
        await resolve({ season: detectSeason() });
        return;
      }
      writeVisitorPref("autoSeason", "0");
      writeVisitorPref("season", season);
      await resolve({ season });
    },
    [resolve],
  );

  const nav = useMemo(() => {
    if (!data) return EMPTY_NAV;
    const by = (location: NavItem["location"]) =>
      data.navigation
        .filter((item) => item.location === location && item.is_active)
        .sort((a, b) => a.order - b.order);
    const header = by("header");
    return {
      header,
      // If no mobile-specific menu is configured, reuse the header items.
      mobile: by("mobile").length ? by("mobile") : header,
      footer: by("footer"),
    };
  }, [data]);

  const value: BootstrapState = {
    loading,
    error,
    data,
    site: data?.settings ?? null,
    theme,
    artist: data?.artist ?? null,
    nav,
    setTemplate,
    setMode,
    setSeason,
    reload: load,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBootstrap(): BootstrapState {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useBootstrap must be used inside <BootstrapProvider>");
  return ctx;
}
