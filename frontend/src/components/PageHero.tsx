import type { ReactNode } from "react";
import { Reveal } from "@/motion/Reveal";
import { cx } from "@/lib/format";

/**
 * One masthead for every interior page. It reuses the landing-page vocabulary
 * (band + pattern + accent rule + glow) so `/artworks`, `/about`, `/resume`,
 * `/collections`, `/exhibitions` and `/contact` read as the same designed site
 * rather than six unrelated documents.
 */

export type HeroTone = "paper" | "warm" | "soft" | "ink";

const TONE: Record<HeroTone, string> = {
  paper: "",
  warm: "band",
  soft: "band-soft",
  ink: "band-dark",
};

export function PageHero({
  eyebrow,
  title,
  lead,
  tone = "soft",
  pattern = "pat-dots",
  aside,
  children,
  seasonLine = true,
}: {
  eyebrow?: string;
  title: string;
  lead?: string | null;
  tone?: HeroTone;
  pattern?: string;
  aside?: ReactNode;
  children?: ReactNode;
  seasonLine?: boolean;
}) {
  return (
    <header className={cx("page-hero pat glow-hero", TONE[tone], pattern)}>
      {seasonLine ? <hr className="season-line" /> : null}
      <div className="container-x pb-[clamp(3rem,6vw,5rem)] pt-[calc(var(--header-h)+clamp(3.5rem,7vw,6rem))]">
        <div className="grid items-end gap-8 md:grid-cols-[1.5fr_auto]">
          <div>
            {eyebrow ? (
              <Reveal>
                <p className="eyebrow">{eyebrow}</p>
              </Reveal>
            ) : null}
            <Reveal variant="maskUp" index={1}>
              <h1 className="t-h1 mt-4">{title}</h1>
            </Reveal>
            <Reveal index={2}>
              <span className="rule-accent mt-6" />
            </Reveal>
            {lead ? (
              <Reveal index={3}>
                <p className="t-body mt-6 max-w-2xl leading-loose text-muted">
                  {lead}
                </p>
              </Reveal>
            ) : null}
          </div>
          {aside ? (
            <Reveal index={2} className="md:text-end">
              {aside}
            </Reveal>
          ) : null}
        </div>
        {children}
      </div>
    </header>
  );
}

/** Big gradient count used in the masthead corner (works, collections, ...). */
export function HeroCount({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div>
      <p className="numeral" aria-hidden="true">
        {value}
      </p>
      <p className="t-caption mt-2 text-muted">{label}</p>
    </div>
  );
}
