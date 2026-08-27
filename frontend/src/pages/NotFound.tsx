import { useEffect } from "react";
import { Link } from "react-router-dom";
import { applySeo } from "@/lib/seo";
import { Reveal } from "@/motion/Reveal";

export default function NotFound() {
  useEffect(() => {
    applySeo({ title: "صفحه پیدا نشد", noindex: true });
  }, []);

  return (
    <div className="container-x flex min-h-[70vh] items-center pt-[var(--header-h)]">
      <Reveal>
        <p className="eyebrow">۴۰۴</p>
        <h1 className="mt-4 text-4xl md:text-5xl">این صفحه پیدا نشد</h1>
        <p className="mt-4 max-w-md text-muted">
          ممکن است نشانی تغییر کرده یا اثر مورد نظر از نمایش خارج شده باشد.
        </p>
        <div className="mt-8 flex gap-3">
          <Link to="/" className="btn btn-primary">
            صفحه‌ی اول
          </Link>
          <Link to="/artworks" className="btn btn-ghost">
            دیدن آثار
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
