import { useBootstrap } from "@/store/bootstrap";
import { cx } from "@/lib/format";

/**
 * SEASON MARK
 *
 * The seasonal design of the original prototype, rebuilt as a real, quiet
 * detail instead of floating particles: the resolved theme provides the season
 * word, its glyph and the seasonal accent pair (`--season-1/2/glow`), which the
 * gradients and washes across the site already use. This chip simply names the
 * season, so the site visibly changes with the time of year.
 *
 * It renders nothing when the backend reports no season, so it can be dropped
 * anywhere without a fallback check.
 */
export function SeasonMark({ className }: { className?: string }) {
  const { theme } = useBootstrap();
  const word = theme?.seasonWord?.trim();
  const icon = theme?.seasonIcon?.trim();
  if (!word && !icon) return null;

  return (
    <span
      className={cx("season-mark", className)}
      data-season={theme?.season || undefined}
    >
      {icon ? (
        <span data-icon aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {word ? <span>{word}</span> : null}
    </span>
  );
}
