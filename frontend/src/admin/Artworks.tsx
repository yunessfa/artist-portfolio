import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { AdminHeader } from "./Layout";
import { SortableList } from "./SortableList";
import { EmptyState, ErrorState, Spinner } from "@/components/Feedback";
import { api } from "@/lib/api";
import { toPersianDigits } from "@/lib/format";
import type { Artwork, Paginated } from "@/lib/types";

export default function Artworks() {
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, loading, error, refetch } = useApi<Paginated<Artwork>>(
    "/artworks/",
    { page_size: 100, search: search || undefined, status: "all" },
    true,
  );

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.results || [];

  return (
    <>
      <AdminHeader
        title="آثار"
        subtitle="ایجاد، ویرایش، انتشار و مرتب‌سازی آثار"
        action={
          <Link to="/admin-panel/artworks/new" className="btn btn-primary">
            اثر جدید
          </Link>
        }
      />

      <input
        className="field mb-6 max-w-xs"
        placeholder="جستجوی عنوان…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? <Spinner /> : null}
      {error ? <ErrorState title="دریافت آثار ممکن نشد" body={error} /> : null}
      {!loading && !rows.length ? (
        <EmptyState title="هنوز اثری ثبت نشده" />
      ) : null}

      <div className={busy ? "pointer-events-none opacity-60" : undefined}>
        <SortableList
          items={rows}
          onReorder={(ids) =>
            void act(() => api.admin.post("/artworks/reorder/", { order: ids }))
          }
          renderItem={(item) => (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/admin-panel/artworks/${item.id}`}
                className="min-w-40 flex-1"
              >
                <span className="block text-sm">{item.title}</span>
                <span className="block text-xs text-muted">
                  {toPersianDigits(item.year)} ·{" "}
                  {item.category?.label || "بدون دسته"} ·{" "}
                  {item.is_published ? "منتشرشده" : "پیش‌نویس"}
                </span>
              </Link>

              <button
                type="button"
                className="btn btn-ghost !py-1.5 !text-xs"
                onClick={() =>
                  void act(() =>
                    api.admin.post(
                      `/artworks/${item.id}/${item.is_published ? "unpublish" : "publish"}/`,
                      {},
                    ),
                  )
                }
              >
                {item.is_published ? "لغو انتشار" : "انتشار"}
              </button>
              <button
                type="button"
                className="btn btn-ghost !py-1.5 !text-xs"
                onClick={() =>
                  void act(() =>
                    api.admin.post(`/artworks/${item.id}/toggle-feature/`, {}),
                  )
                }
              >
                {item.is_featured ? "حذف از ویژه" : "ویژه"}
              </button>
              <button
                type="button"
                className="btn btn-ghost !py-1.5 !text-xs"
                onClick={() =>
                  void act(() =>
                    api.admin.post(`/artworks/${item.id}/duplicate/`, {}),
                  )
                }
              >
                تکثیر
              </button>
              <button
                type="button"
                className="btn btn-ghost !py-1.5 !text-xs"
                onClick={() => {
                  if (window.confirm(`حذف «${item.title}»؟`)) {
                    void act(() => api.admin.delete(`/artworks/${item.id}/`));
                  }
                }}
              >
                حذف
              </button>
            </div>
          )}
        />
      </div>
    </>
  );
}
