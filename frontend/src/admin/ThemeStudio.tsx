import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { AdminHeader } from "./Layout";
import { Spinner } from "@/components/Feedback";
import { api } from "@/lib/api";
import { applyTheme } from "@/lib/theme";
import { cx } from "@/lib/format";
import { useBootstrap } from "@/store/bootstrap";
import type { ResolvedTheme, ThemeSummary } from "@/lib/types";

const NUMBER_FIELDS: Array<{
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  {
    name: "animation_speed",
    label: "سرعت انیمیشن",
    min: 0.4,
    max: 2,
    step: 0.05,
  },
  {
    name: "parallax_intensity",
    label: "شدت پارالاکس",
    min: 0,
    max: 2,
    step: 0.05,
  },
  { name: "radius", label: "گردی گوشه‌ها", min: 0, max: 40, step: 1 },
  { name: "radius_sm", label: "گردی کوچک", min: 0, max: 30, step: 1 },
  { name: "border_width", label: "ضخامت خط", min: 0, max: 4, step: 1 },
  { name: "body_size", label: "اندازه‌ی متن", min: 13, max: 20, step: 0.5 },
  {
    name: "section_spacing",
    label: "فاصله‌ی بخش‌ها",
    min: 60,
    max: 220,
    step: 4,
  },
  { name: "grid_gap", label: "فاصله‌ی گرید", min: 8, max: 60, step: 2 },
];

const SELECT_FIELDS: Array<{
  name: string;
  label: string;
  options: Array<[string, string]>;
}> = [
  {
    name: "motion_style",
    label: "سبک حرکت",
    options: [
      ["minimal", "مینیمال"],
      ["elegant", "لطیف"],
      ["cinematic", "سینمایی"],
      ["experimental", "تجربی"],
    ],
  },
  {
    name: "reveal_preset",
    label: "پریست نمایش",
    options: [
      ["fade_up", "Fade Up"],
      ["fade_in", "Fade In"],
      ["slide_reveal", "Slide Reveal"],
      ["image_reveal", "Image Reveal"],
      ["clip_reveal", "Clip Reveal"],
      ["scale_reveal", "Scale Reveal"],
      ["text_split", "Text Split"],
    ],
  },
  {
    name: "page_transition",
    label: "گذر بین صفحه‌ها",
    options: [
      ["fade", "Fade"],
      ["slide", "Slide"],
      ["curtain", "Curtain"],
      ["none", "بدون انیمیشن"],
    ],
  },
  {
    name: "gallery_layout",
    label: "چیدمان گالری",
    options: [
      ["masonry", "Masonry"],
      ["editorial", "Editorial"],
      ["minimal", "Minimal"],
      ["large_cards", "Large Cards"],
      ["asymmetric", "Asymmetric"],
      ["fullscreen", "Fullscreen"],
    ],
  },
  {
    name: "button_style",
    label: "سبک دکمه",
    options: [
      ["soft", "نرم"],
      ["pill", "قرصی"],
      ["sharp", "تیز"],
      ["outline", "خطی"],
    ],
  },
  {
    name: "card_style",
    label: "سبک کارت",
    options: [
      ["soft", "نرم"],
      ["elevated", "برجسته"],
      ["bordered", "خط‌دار"],
      ["brutal", "بروتال"],
      ["flat", "تخت"],
    ],
  },
  {
    name: "cursor_style",
    label: "نشانگر موس",
    options: [
      ["none", "پیش‌فرض"],
      ["dot", "نقطه"],
      ["ring", "حلقه"],
      ["cross", "ضربدری"],
    ],
  },
];

export default function ThemeStudio() {
  const { theme: activeTheme, reload } = useBootstrap();
  const {
    data: themes,
    loading,
    refetch,
  } = useApi<ThemeSummary[] | { results: ThemeSummary[] }>(
    "/themes/",
    { page_size: 50 },
    true,
  );
  const [preview, setPreview] = useState<ResolvedTheme | null>(null);
  const [values, setValues] = useState<
    Record<string, string | number | boolean>
  >({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const list = Array.isArray(themes) ? themes : themes?.results || [];

  useEffect(() => {
    if (!activeTheme) return;
    setValues({
      animation_speed: activeTheme.motion.animationSpeed,
      parallax_intensity: activeTheme.motion.parallaxIntensity,
      reveal_preset: activeTheme.motion.revealPreset,
      page_transition: activeTheme.motion.pageTransition,
      motion_style: activeTheme.motion.style,
      gallery_layout: activeTheme.galleryLayout,
      cursor_style: activeTheme.cursorStyle,
      button_style: activeTheme.buttonStyle,
      card_style: activeTheme.cardStyle,
      enable_particles: activeTheme.motion.particles,
      enable_grain: activeTheme.motion.grain,
    });
  }, [activeTheme]);

  // Live preview without activating: fetch the resolved tokens and paint them.
  const previewTheme = async (key: string) => {
    const resolved = await api.get<ResolvedTheme>(`/themes/${key}/preview/`);
    setPreview(resolved);
    applyTheme(resolved);
  };

  const activate = async (key: string) => {
    setBusy(true);
    try {
      await api.admin.post(`/themes/${key}/activate/`, {});
      await reload();
      await refetch();
      setPreview(null);
      setMessage("قالب فعال شد و در دیتابیس ذخیره شد.");
    } finally {
      setBusy(false);
    }
  };

  const saveCustomization = async () => {
    setBusy(true);
    try {
      await api.admin.patch("/theme/active/", values);
      await reload();
      setMessage("تنظیمات قالب ذخیره شد.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <AdminHeader
        title="استودیوی قالب"
        subtitle="قالب‌های موجود سایت، پیش‌نمایش زنده و شخصی‌سازی کامل"
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void saveCustomization()}
            disabled={busy}
          >
            ذخیره‌ی تنظیمات
          </button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((item) => {
          const isActive = activeTheme?.themeKey === item.key;
          return (
            <article
              key={item.key}
              className={cx("card p-5", isActive && "ring-1")}
              style={
                isActive ? { boxShadow: "0 0 0 1px var(--accent)" } : undefined
              }
            >
              <div className="flex gap-1.5">
                {(item.swatch || []).map((color) => (
                  <span
                    key={color}
                    className="h-7 flex-1 rounded"
                    style={{
                      background: color,
                      border: "1px solid var(--line)",
                    }}
                  />
                ))}
              </div>
              <h2 className="mt-4 font-display text-lg">{item.name}</h2>
              <p className="mt-1 text-xs text-muted">{item.note}</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost !py-1.5 !text-xs"
                  onClick={() => void previewTheme(item.key)}
                >
                  پیش‌نمایش
                </button>
                <button
                  type="button"
                  className="btn btn-primary !py-1.5 !text-xs"
                  disabled={isActive || busy}
                  onClick={() => void activate(item.key)}
                >
                  {isActive ? "فعال" : "فعال‌سازی"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {preview ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 border border-line p-4 text-sm">
          <span>پیش‌نمایش «{preview.themeName}» فعال است (بدون ذخیره).</span>
          <button
            type="button"
            className="btn btn-ghost !py-1.5 !text-xs"
            onClick={() => {
              setPreview(null);
              if (activeTheme) applyTheme(activeTheme);
            }}
          >
            بازگشت به قالب فعال
          </button>
        </div>
      ) : null}

      <section className="card mt-8 p-6">
        <h2 className="font-display text-lg">شخصی‌سازی قالب فعال</h2>
        <p className="mt-2 text-xs text-muted">
          این مقادیر روی رکورد قالب در دیتابیس ذخیره می‌شوند و برای همه‌ی
          بازدیدکنندگان اعمال می‌شوند.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {NUMBER_FIELDS.map((field) => (
            <div key={field.name}>
              <label
                className="mb-2 flex justify-between text-xs text-muted"
                htmlFor={field.name}
              >
                <span>{field.label}</span>
                <span dir="ltr">{String(values[field.name] ?? "")}</span>
              </label>
              <input
                id={field.name}
                type="range"
                className="w-full"
                min={field.min}
                max={field.max}
                step={field.step}
                value={Number(values[field.name] ?? field.min)}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.name]: Number(event.target.value),
                  }))
                }
              />
            </div>
          ))}

          {SELECT_FIELDS.map((field) => (
            <div key={field.name}>
              <label
                className="mb-2 block text-xs text-muted"
                htmlFor={field.name}
              >
                {field.label}
              </label>
              <select
                id={field.name}
                className="field"
                value={String(values[field.name] ?? field.options[0][0])}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.name]: event.target.value,
                  }))
                }
              >
                {field.options.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {[
            ["enable_particles", "ذرات فصلی"],
            ["enable_grain", "بافت دانه‌دار"],
          ].map(([name, label]) => (
            <label key={name} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={Boolean(values[name])}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [name]: event.target.checked,
                  }))
                }
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      {message ? (
        <p className="mt-6 text-sm" role="status">
          {message}
        </p>
      ) : null}
    </>
  );
}
