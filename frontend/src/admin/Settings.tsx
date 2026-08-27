import { useCallback, useEffect, useRef, useState } from "react";
import { AdminHeader, AdminPanel } from "./Layout";
import { ErrorState, Spinner } from "@/components/Feedback";
import { api, ApiError } from "@/lib/api";
import { assetUrl } from "@/lib/branding";
import { useBootstrap } from "@/store/bootstrap";
import type { MediaAsset } from "@/lib/types";

/**
 * BRAND & SITE SETTINGS
 *
 * Single admin surface behind every piece of branding on the public site:
 * names, logo, logo mark, favicon, social image, SEO defaults, contact block
 * and maintenance mode. Reads and writes the real singleton endpoint
 * `GET/PATCH /api/v1/site-settings/` — no local-only state, nothing faked.
 */

type Settings = {
  site_name: string;
  site_name_en: string;
  artist_display_name: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  studio_note: string;
  map_url: string;
  default_seo_title: string;
  default_seo_description: string;
  show_prices: boolean;
  enable_intro_loader: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  logo_detail?: MediaAsset | null;
  logo_mark_detail?: MediaAsset | null;
  favicon_detail?: MediaAsset | null;
  default_og_image_detail?: MediaAsset | null;
};

type BrandSlot = {
  key: "logo" | "logo_mark" | "favicon" | "default_og_image";
  detail:
    | "logo_detail"
    | "logo_mark_detail"
    | "favicon_detail"
    | "default_og_image_detail";
  label: string;
  help: string;
};

const SLOTS: BrandSlot[] = [
  {
    key: "logo",
    detail: "logo_detail",
    label: "لوگوی اصلی",
    help: "در هدر و فوتر نمایش داده می‌شود. SVG یا PNG با پس‌زمینه‌ی شفاف.",
  },
  {
    key: "logo_mark",
    detail: "logo_mark_detail",
    label: "نشانه‌ی لوگو",
    help: "نسخه‌ی کوتاه لوگو برای موبایل و اینترو.",
  },
  {
    key: "favicon",
    detail: "favicon_detail",
    label: "فاویکون",
    help: "آیکون تب مرورگر. مربعی، حداقل ۵۱۲ پیکسل.",
  },
  {
    key: "default_og_image",
    detail: "default_og_image_detail",
    label: "تصویر اشتراک‌گزاری",
    help: "وقتی لینک سایت در شبکه‌ها فرستاده می‌شود. نسبت ۱۲۰۰×۶۳۰.",
  },
];

const TEXT_KEYS = [
  "site_name",
  "site_name_en",
  "artist_display_name",
  "tagline",
  "description",
  "email",
  "phone",
  "address",
  "studio_note",
  "map_url",
  "default_seo_title",
  "default_seo_description",
  "maintenance_message",
] as const;

export default function Settings() {
  const { reload } = useBootstrap();
  const [data, setData] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busySlot, setBusySlot] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.admin.get<Settings>("/site-settings/");
      setData(res);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.fieldLines.join(" ") || "دریافت تنطیمات ناموفق بود."
          : "دریافت تنطیمات ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setErrors({});
    try {
      const body: Record<string, unknown> = {
        show_prices: data.show_prices,
        enable_intro_loader: data.enable_intro_loader,
        maintenance_mode: data.maintenance_mode,
      };
      for (const key of TEXT_KEYS) body[key] = data[key] ?? "";
      const res = await api.admin.patch<Settings>("/site-settings/", body);
      setData(res);
      setSaved(true);
      await reload(); // public site picks up the new brand immediately
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldMessages);
      else setErrors({ detail: "ذخیره‌سازی ناموفق بود." });
    } finally {
      setSaving(false);
    }
  };

  /** Uploads to the media library, then links the asset to the brand slot. */
  const pickAsset = async (slot: BrandSlot, file: File) => {
    setBusySlot(slot.key);
    setErrors({});
    try {
      const asset = await api.admin.upload<MediaAsset>("/media/", {
        file,
        kind: "image",
        title: slot.label,
        alt_text: slot.label,
      });
      const res = await api.admin.patch<Settings>("/site-settings/", {
        [slot.key]: asset.id,
      });
      setData(res);
      await reload();
    } catch (err) {
      setErrors({
        [slot.key]:
          err instanceof ApiError
            ? err.fieldLines.join(" ") || "بارگزاری ناموفق بود."
            : "بارگزاری ناموفق بود.",
      });
    } finally {
      setBusySlot(null);
    }
  };

  const clearAsset = async (slot: BrandSlot) => {
    setBusySlot(slot.key);
    try {
      const res = await api.admin.patch<Settings>("/site-settings/", {
        [slot.key]: null,
      });
      setData(res);
      await reload();
    } finally {
      setBusySlot(null);
    }
  };

  if (loading) {
    return (
      <>
        <AdminHeader title="برند و تنطیمات سایت" />
        <AdminPanel>
          <Spinner label="دریافت تنطیمات…" />
        </AdminPanel>
      </>
    );
  }

  if (loadError || !data) {
    return (
      <>
        <AdminHeader title="برند و تنطیمات سایت" />
        <ErrorState
          title="تنطیمات بارگزاری نشد"
          body={loadError ?? undefined}
          onRetry={() => void load()}
        />
      </>
    );
  }

  return (
    <>
      <AdminHeader
        title="برند و تنطیمات سایت"
        subtitle="هر چیزی که در این ص��حه تغییر کنید، بلافاصله در کل سایت اعمال می‌شود."
        action={
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? "در حال ذخیره…" : "ذخیره‌ی تغییرات"}
          </button>
        }
      />

      {errors.detail ? (
        <p className="t-small mb-6 text-accent">{errors.detail}</p>
      ) : null}
      {saved ? (
        <p className="t-small mb-6 text-muted">تغییرات ذخیره شد.</p>
      ) : null}

      <AdminPanel
        title="هویت برند"
        description="نام سایت، نام هنرمند و معرفی کوتاه. هیچ کدام در کد ثابت نیست."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="نام سایت"
            value={data.site_name}
            error={errors.site_name}
            onChange={(v) => set("site_name", v)}
          />
          <Field
            label="نام انگلیسی"
            value={data.site_name_en}
            dir="ltr"
            error={errors.site_name_en}
            onChange={(v) => set("site_name_en", v)}
          />
          <Field
            label="نام نمایشی هنرمند"
            value={data.artist_display_name}
            help="خالی بماند تا از پروفایل هنرمند خوانده شود."
            error={errors.artist_display_name}
            onChange={(v) => set("artist_display_name", v)}
          />
          <Field
            label="شعار"
            value={data.tagline}
            error={errors.tagline}
            onChange={(v) => set("tagline", v)}
          />
          <Field
            label="معرفی کوتاه"
            value={data.description}
            area
            className="md:col-span-2"
            error={errors.description}
            onChange={(v) => set("description", v)}
          />
        </div>
      </AdminPanel>

      <AdminPanel
        title="دارایی‌های برند"
        description="فایل‌ها در کتابخانه‌ی رسانه ذخیره می‌شوند و بلافاصله در هدر، فوتر و تب مرورگر دیده می‌شوند."
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {SLOTS.map((slot) => (
            <AssetSlot
              key={slot.key}
              slot={slot}
              asset={data[slot.detail] ?? null}
              busy={busySlot === slot.key}
              error={errors[slot.key]}
              onPick={(file) => void pickAsset(slot, file)}
              onClear={() => void clearAsset(slot)}
            />
          ))}
        </div>
      </AdminPanel>

      <AdminPanel
        title="عنوان و توضیح پیش‌فرض (SEO)"
        description="اگر خالی بماند، از نام سایت و معرفی کوتاه استفاده می‌شود."
      >
        <div className="grid gap-5">
          <Field
            label="عنوان مرورگر"
            value={data.default_seo_title}
            error={errors.default_seo_title}
            onChange={(v) => set("default_seo_title", v)}
          />
          <Field
            label="توضیح متا"
            value={data.default_seo_description}
            area
            error={errors.default_seo_description}
            onChange={(v) => set("default_seo_description", v)}
          />
        </div>
      </AdminPanel>

      <AdminPanel title="تماس و استودیو">
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="ایمیل"
            value={data.email}
            dir="ltr"
            error={errors.email}
            onChange={(v) => set("email", v)}
          />
          <Field
            label="تلفن"
            value={data.phone}
            dir="ltr"
            error={errors.phone}
            onChange={(v) => set("phone", v)}
          />
          <Field
            label="نشانی"
            value={data.address}
            error={errors.address}
            onChange={(v) => set("address", v)}
          />
          <Field
            label="توضیح استودیو"
            value={data.studio_note}
            error={errors.studio_note}
            onChange={(v) => set("studio_note", v)}
          />
          <Field
            label="لینک نقشه"
            value={data.map_url}
            dir="ltr"
            className="md:col-span-2"
            error={errors.map_url}
            onChange={(v) => set("map_url", v)}
          />
        </div>
      </AdminPanel>

      <AdminPanel
        title="رفتار سایت"
        footer={
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? "در حال ذخیره…" : "ذخیره‌ی تغییرات"}
          </button>
        }
      >
        <div className="space-y-4">
          <Toggle
            label="نمایش قیمت آثار"
            checked={data.show_prices}
            onChange={(v) => set("show_prices", v)}
          />
          <Toggle
            label="نمایش اینتروی ورود"
            checked={data.enable_intro_loader}
            onChange={(v) => set("enable_intro_loader", v)}
          />
          <Toggle
            label="حالت تعمیر و نگهداری"
            help="با فعال شدن، بازدیدکنندگان پیام زیر را می‌بینند. پنل مدیریت باز می‌ماند."
            checked={data.maintenance_mode}
            onChange={(v) => set("maintenance_mode", v)}
          />
          {data.maintenance_mode ? (
            <Field
              label="پیام حالت تعمیر"
              value={data.maintenance_message}
              area
              error={errors.maintenance_message}
              onChange={(v) => set("maintenance_message", v)}
            />
          ) : null}
        </div>
      </AdminPanel>
    </>
  );
}

/* ---------------------------------- bits --------------------------------- */

function Field({
  label,
  value,
  onChange,
  area,
  help,
  error,
  dir,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
  help?: string;
  error?: string;
  dir?: "ltr" | "rtl";
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="field-label">{label}</span>
      {area ? (
        <textarea
          className="field mt-2 min-h-[104px]"
          value={value ?? ""}
          dir={dir}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="field mt-2"
          value={value ?? ""}
          dir={dir}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error ? (
        <span className="t-caption mt-2 block text-accent">{error}</span>
      ) : null}
      {help && !error ? (
        <span className="t-caption mt-2 block text-muted">{help}</span>
      ) : null}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  help?: string;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[var(--accent)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="t-body block">{label}</span>
        {help ? <span className="t-caption text-muted">{help}</span> : null}
      </span>
    </label>
  );
}

function AssetSlot({
  slot,
  asset,
  busy,
  error,
  onPick,
  onClear,
}: {
  slot: BrandSlot;
  asset: MediaAsset | null;
  busy: boolean;
  error?: string;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const url = assetUrl(asset);
  return (
    <div>
      <p className="field-label">{slot.label}</p>
      <div className="mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden border border-line bg-surface2">
        {busy ? (
          <Spinner label="بارگزاری…" />
        ) : url ? (
          <img
            src={url}
            alt={asset?.alt_text || slot.label}
            className="h-full w-full object-contain p-4"
            loading="lazy"
          />
        ) : (
          <span className="t-caption text-muted">تنطیم نشده</span>
        )}
      </div>
      <p className="t-caption mt-2 text-muted">{slot.help}</p>
      {error ? <p className="t-caption mt-1 text-accent">{error}</p> : null}
      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          className="t-caption"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <span className="link-u">{url ? "تغییر فایل" : "بارگزاری فایل"}</span>
        </button>
        {url ? (
          <button
            type="button"
            className="t-caption text-muted"
            onClick={onClear}
            disabled={busy}
          >
            <span className="link-u">حذف</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
