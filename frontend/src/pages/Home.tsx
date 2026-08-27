import { useEffect } from "react";
import { useBootstrap } from "@/store/bootstrap";
import { SectionRenderer } from "@/sections/SectionRenderer";
import { Spinner } from "@/components/Feedback";
import { applySeo } from "@/lib/seo";

export default function Home() {
  const { data, site, artist, loading } = useBootstrap();

  useEffect(() => {
    if (!site) return;
    applySeo({
      title: data?.home?.seo_title || site.default_seo_title || site.site_name,
      description:
        data?.home?.seo_description ||
        site.default_seo_description ||
        site.description,
      image: site.default_og_image?.url || artist?.portrait?.url || null,
      jsonLd: artist
        ? {
            "@context": "https://schema.org",
            "@type": "Person",
            name: artist.name,
            alternateName: artist.name_latin || undefined,
            jobTitle: artist.role,
            email: artist.email || undefined,
          }
        : null,
    });
  }, [artist, data?.home, site]);

  if (loading) return <Spinner />;

  const sections = (data?.home?.sections || [])
    .filter((section) => section.is_enabled)
    .slice()
    .sort((a, b) => a.order - b.order);

  if (!sections.length) {
    return (
      <div className="container-x section-y pt-[calc(var(--header-h)+72px)]">
        <h1 className="font-display text-4xl">
          {artist?.name || site?.site_name}
        </h1>
        <p className="mt-4 text-muted">
          هنوز بخشی برای صفحه‌ی اول ساخته نشده است. از پنل مدیریت بخش‌ها را
          اضافه کنید.
        </p>
      </div>
    );
  }

  return (
    <>
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}
