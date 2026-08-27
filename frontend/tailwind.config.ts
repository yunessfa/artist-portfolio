import type { Config } from "tailwindcss"

/**
 * Tailwind is intentionally a thin mapping over the CSS custom properties in
 * src/index.css. Utilities never introduce new design values — they only expose
 * the design-system tokens, so the palette and scale have exactly one source.
 */
export default {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				bg: "var(--bg)",
				surface: "var(--surface)",
				surface2: "var(--surface-2)",
				surface3: "var(--surface-3)",
				line: "var(--line)",
				lineStrong: "var(--line-strong)",
				ink: "var(--text)",
				ink2: "var(--text-2)",
				muted: "var(--muted)",
				accent: "var(--accent)",
				accentHover: "var(--accent-hover)",
				accentSoft: "var(--accent-soft)",
				onAccent: "var(--on-accent)",
			},
			fontFamily: {
				display: "var(--font-display)",
				body: "var(--font-body)",
			},
			fontSize: {
				display: ["var(--fs-display)", { lineHeight: "var(--lh-display)" }],
				h1: ["var(--fs-h1)", { lineHeight: "var(--lh-heading)" }],
				h2: ["var(--fs-h2)", { lineHeight: "var(--lh-heading)" }],
				h3: ["var(--fs-h3)", { lineHeight: "var(--lh-tight)" }],
				caption: ["var(--fs-caption)", { lineHeight: "1.6" }],
			},
			borderRadius: {
				theme: "var(--radius)",
				themeSm: "var(--radius)",
				pill: "var(--radius-pill)",
			},
			boxShadow: {
				theme: "var(--shadow)",
				lift: "var(--shadow-lift)",
			},
			spacing: {
				s1: "var(--s-1)",
				s2: "var(--s-2)",
				s3: "var(--s-3)",
				s4: "var(--s-4)",
				s5: "var(--s-5)",
				s6: "var(--s-6)",
				s7: "var(--s-7)",
				s8: "var(--s-8)",
				s9: "var(--s-9)",
				s10: "var(--s-10)",
				s11: "var(--s-11)",
				section: "var(--section-space)",
				header: "var(--header-h)",
			},
			maxWidth: {
				container: "var(--container-w)",
			},
			transitionTimingFunction: {
				theme: "var(--ease)",
				themeInOut: "var(--ease-in-out)",
			},
			transitionDuration: {
				fast: "220ms",
				base: "450ms",
				slow: "900ms",
			},
		},
	},
	plugins: [],
} satisfies Config
