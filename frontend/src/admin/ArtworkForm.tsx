import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { AdminHeader } from "./Layout";
import { SortableList } from "./SortableList";
import { Spinner } from "@/components/Feedback";
import { SmartImage } from "@/components/SmartImage";
import { ApiError, api } from "@/lib/api";
import type { Artwork, Collection, MediaAsset, Paginated } from "@/lib/types";
import { useBootstrap } from "@/store/bootstrap";

type Values = Record<string, string | number | boolean | null>;

const TEXT_FIELDS: Array<{ name: string; label: string; type?: string }> = [
  { name: "title", label: "عنوان" },
  { name: "title_en", label: "عنوان انگلیسی" },
  { name: "slug", label: "نامک (slug)" },
  { name: "year", label: "سال خلق" },
  { name: "technique", label: "تکنیک" },
  { name: "material", label: "متریال" },
  { name: "dimensions", label: "ابعاد" },
  { name: "price", label: "قیمت", type: "number" },
  { name: "seo_title", label: "SEO Title" },
];

const AREA_FIELDS: Array<{ name: string; label: string }> = [
  { name: "excerpt", label: "توضیح کوتاه" },
  { name: "description", label: "توضیح کامل" },
  { name: "concept", label: "داستان / کانسپت" },
  { name: "artist_note", label: "یادداشت هنرمند" },
  { name: "seo_description", label: "SEO Description" },
];

const AVAILABILITY = [
  ["available", "موجود"],
  ["sold", "فروخته‌شده"],
  ["reserved", "رزرو"],
  ["not_for_sale", "غیرقابل فروش"],
  ["private", "مجموعه‌ی خصوصی"],
  ["on_loan", "امانتی"],
  ["commission", "سفارشی"],
];

const SPANS = [
  ["normal", "عادی"],
  ["wide", "عریض"],
  ["tall", "بلند"],
  ["large", "بزرگ"],
];

export default function ArtworkForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: boot } = useBootstrap();
  const isNew = !id;
  const {
    data: artwork,
    loading,
    refetch,
  } = useApi<Artwork>(id ? `/artworks/${id}/` : null, undefined, true);
  const { data: collections } = useApi<Paginated<Collection>>(
    "/collections/",
    { page_size: 100 },
    true,
  );
  const [values, setValues] = useState<Values>({
    availability: "available",
    layout_span: "normal",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!artwork) return;
    setValues({
      title: artwork.title,
      title_en: artwork.title_en,
      slug: artwork.slug,
      year: artwork.year,
      technique: artwork.technique,
      material: artwork.material,
      dimensions: artwork.dimensions,
      price: artwork.price,
      show_price: artwork.show_price,
      excerpt: artwork.excerpt,
      description: artwork.description ?? "",
      concept: artwork.concept ?? "",
      artist_note: artwork.artist_note ?? "",
      seo_title: artwork.seo_title ?? "",
      seo_description: artwork.seo_description ?? "",
      availability: artwork.availability,
      layout_span: artwork.layout_span,
      allow_zoom: artwork.allow_zoom,
      is_featured: artwork.is_featured,
      status: artwork.status,
      category: artwork.category?.id ?? null,
      collection: artwork.collection?.id ?? null,
      hero_image: artwork.hero_image ?? null,
    });
  }, [artwork]);

  const set = (name: string, value: Values[string]) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      if (isNew) {
        const created = await api.admin.post<Artwork>("/artworks/", values);
        navigate(`/admin-panel/artworks/${created.id}`, { replace: true });
        setMessage("اثر ساخته شد.");
      } else {
        await api.admin.patch(`/artworks/${id}/`, values);
        await refetch();
        setMessage("تغییرات ذخیره شد.");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldMessages || {});
        setMessage(error.message);
      } else {
        setMessage("ذخیره ممکن نشد.");
      }
    } finally {
      setBusy(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || !id) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const asset = await api.admin.upload<MediaAsset>("/media/", {
          file,
          kind: "image",
          title: file.name,
        });
        await api.admin.post("/artwork-images/", {
          artwork: Number(id),
          image: asset.id,
          role: "detail",
        });
      }
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const images = artwork?.images || [];

  return (
    <form onSubmit={save}>
      <AdminHeader
        title={isNew ? "اثر جدید" : artwork?.title || "ویرایش اثر"}
        subtitle="تمام فیلدهای اثر از اینجا مدیریت می‌شوند"
        action={
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "در حال ذخیره…" : "ذخیره"}
          </button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {TEXT_FIELDS.map((field) => (
              <div key={field.name}>
                <label
                  className="mb-2 block text-xs text-muted"
                  htmlFor={field.name}
                >
                  {field.label}
                </label>
                <input
                  id={field.name}
                  className="field"
                  type={field.type || "text"}
                  value={String(values[field.name] ?? "")}
                  onChange={(event) => set(field.name, event.target.value)}
                />
                {errors[field.name] ? (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--accent)" }}
                  >
                    {errors[field.name]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {AREA_FIELDS.map((field) => (
            <div key={field.name} className="mt-5">
              <label
                className="mb-2 block text-xs text-muted"
                htmlFor={field.name}
              >
                {field.label}
              </label>
              <textarea
                id={field.name}
                className="field min-h-28"
                value={String(values[field.name] ?? "")}
                onChange={(event) => set(field.name, event.target.value)}
              />
            </div>
          ))}
        </section>

        <aside className="space-y-6">
          <section className="card space-y-5 p-6">
            <div>
              <label className="mb-2 block text-xs text-muted" htmlFor="status">
                وضعیت انتشار
              </label>
              <select
                id="status"
                className="field"
                value={String(values.status ?? "draft")}
                onChange={(event) => set("status", event.target.value)}
              >
                <option value="draft">پیش‌نویس</option>
                <option value="published">منتشرشده</option>
                <option value="archived">بایگانی</option>
              </select>
            </div>

            <div>
              <label
                className="mb-2 block text-xs text-muted"
                htmlFor="category"
              >
                دسته‌بندی
              </label>
              <select
                id="category"
                className="field"
                value={String(values.category ?? "")}
                onChange={(event) =>
                  set(
                    "category",
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              >
                <option value="">—</option>
                {(boot?.categories || []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="mb-2 block text-xs text-muted"
                htmlFor="collection"
              >
                مجموعه
              </label>
              <select
                id="collection"
                className="field"
                value={String(values.collection ?? "")}
                onChange={(event) =>
                  set(
                    "collection",
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              >
                <option value="">—</option>
                {(collections?.results || []).map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="mb-2 block text-xs text-muted"
                htmlFor="availability"
              >
                وضعیت اثر
              </label>
              <select
                id="availability"
                className="field"
                value={String(values.availability ?? "available")}
                onChange={(event) => set("availability", event.target.value)}
              >
                {AVAILABILITY.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="mb-2 block text-xs text-muted"
                htmlFor="layout_span"
              >
                اندازه در گالری
              </label>
              <select
                id="layout_span"
                className="field"
                value={String(values.layout_span ?? "normal")}
                onChange={(event) => set("layout_span", event.target.value)}
              >
                {SPANS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {[
              ["is_featured", "اثر ویژه"],
              ["show_price", "نمایش قیمت"],
              ["allow_zoom", "اجازه‌ی بزرگ‌نمایی"],
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(values[name])}
                  onChange={(event) => set(name, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </section>

          {!isNew ? (
            <section className="card p-6">
              <h2 className="text-sm text-muted">تصاویر</h2>
              <label
                className="mt-4 block cursor-pointer border border-dashed border-line p-6 text-center text-xs text-muted"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void upload(event.dataTransfer.files);
                }}
              >
                تصویر را اینجا رها کنید یا کلیک کنید
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void upload(event.target.files)}
                />
              </label>

              <div className="mt-5">
                <SortableList
                  items={images}
                  onReorder={(ids) =>
                    void api.admin
                      .post("/artwork-images/reorder/", { order: ids })
                      .then(() => refetch())
                  }
                  renderItem={(image) => (
                    <div className="flex items-center gap-3">
                      <div className="w-14 shrink-0 overflow-hidden rounded">
                        <SmartImage asset={image.image} ratio={1} />
                      </div>
                      <input
                        className="field !py-1.5 text-xs"
                        defaultValue={
                          image.alt_override || image.alt_text || ""
                        }
                        placeholder="Alt text"
                        onBlur={(event) =>
                          void api.admin.patch(`/artwork-images/${image.id}/`, {
                            alt_override: event.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-ghost !py-1 !text-xs"
                        onClick={() =>
                          void api.admin
                            .post(`/artwork-images/${image.id}/set-cover/`, {})
                            .then(() => refetch())
                        }
                      >
                        {image.is_cover ? "کاور" : "کاور شود"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost !py-1 !text-xs"
                        onClick={() =>
                          void api.admin
                            .delete(`/artwork-images/${image.id}/`)
                            .then(() => refetch())
                        }
                      >
                        حذف
                      </button>
                    </div>
                  )}
                />
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {message ? (
        <p className="mt-6 text-sm" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
