const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Legacy helper `ua()` preserved verbatim in behaviour. */
export function toPersianDigits(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

export function formatPrice(
  amount: string | number | null | undefined,
  currency = "IRT",
): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  const grouped = n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const unit =
    currency === "IRT" ? "تومان" : currency === "IRR" ? "ریال" : currency;
  return `${toPersianDigits(grouped)} ${unit}`;
}

const FA_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** Gregorian ISO date -> Jalali display string, digits localised. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
    return parts;
  } catch {
    return toPersianDigits(
      `${d.getDate()} ${FA_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    );
  }
}

export function truncate(text: string, max = 160): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
