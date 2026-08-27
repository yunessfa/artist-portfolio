import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useBootstrap } from "@/store/bootstrap";
import { PageHero } from "@/components/PageHero";
import { SeasonMark } from "@/components/SeasonMark";
import { Reveal } from "@/motion/Reveal";
import { ApiError, api } from "@/lib/api";
import { applySeo } from "@/lib/seo";
import { toPersianDigits } from "@/lib/format";

type Status = "idle" | "sending" | "sent" | "error";

export default function Contact() {
  const { site, data } = useBootstrap();
  const location = useLocation();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    applySeo({
      title: `تماس — ${site?.site_name || ""}`,
      description: site?.studio_note || site?.description,
    });
  }, [site]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    setFieldErrors({});
    try {
      await api.post("/contact-messages/", {
        name: values.name,
        email: values.email,
        phone: values.phone,
        subject: values.subject,
        message: values.message,
        honeypot: values.website,
        source_page: location.pathname,
      });
      setStatus("sent");
      setMessage("پیام شما دریافت شد. در اولین فرصت پاسخ می‌دهم.");
      form.reset();
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldMessages || {});
        setMessage(error.message);
      } else {
        setMessage("ارسال پیام ممکن نشد. دوباره تلاش کنید.");
      }
    }
  };

  const error = (field: string) =>
    fieldErrors[field] ? (
      <p className="t-caption mt-2 text-accent">{fieldErrors[field]}</p>
    ) : null;

  return (
    <>
      <PageHero
        eyebrow="تماس"
        title="گفت‌وگو را شروع کنیم"
        lead={
          site?.studio_note ||
          "برای سفارش اثر، دعوت به نمایشگاه، بازدید از کارگاه یا گفت‌وگوی مطبوعاتی پیام بدهید."
        }
        tone="soft"
        pattern="pat-arcs"
        aside={<SeasonMark />}
      />

      <div className="pat pat-dots">
        <div className="container-x section-y">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            {/* Studio card over the dark band: the "museum label" of contact. */}
            <Reveal>
              <div className="band-dark pat pat-rules rounded-[var(--radius)] p-8 md:p-10">
                <p className="eyebrow">استودیو</p>
                <h2 className="t-h3 mt-4">{site?.site_name}</h2>
                <span className="rule-accent mt-5" />

                <div className="mt-8 space-y-3">
                  {site?.email ? (
                    <a
                      className="info-tile"
                      href={`mailto:${site.email}`}
                      dir="ltr"
                    >
                      <span className="t-caption">Email</span>
                      <span className="t-body">{site.email}</span>
                    </a>
                  ) : null}
                  {site?.phone ? (
                    <a className="info-tile" href={`tel:${site.phone}`}>
                      <span className="t-caption">تلفن</span>
                      <span className="t-body">
                        {toPersianDigits(site.phone)}
                      </span>
                    </a>
                  ) : null}
                  {site?.address ? (
                    <div className="info-tile">
                      <span className="t-caption">نشانی</span>
                      <span className="t-body">{site.address}</span>
                    </div>
                  ) : null}
                </div>

                {(data?.socials || []).length ? (
                  <div className="mt-8">
                    <p className="eyebrow">شبکه‌ها</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(data?.socials || []).map((social) => (
                        <a
                          key={social.id}
                          href={social.url}
                          target="_blank"
                          rel="noreferrer"
                          className="chip"
                        >
                          {social.label || social.platform}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {site?.map_url ? (
                  <iframe
                    title="نقشه‌ی استودیو"
                    src={site.map_url}
                    className="mt-8 h-56 w-full rounded-[var(--radius-sm)] border border-[var(--ink-line)]"
                    loading="lazy"
                  />
                ) : null}
              </div>
            </Reveal>

            <Reveal variant="slideReveal" index={1}>
              <form
                className="card card-lift p-7 md:p-10"
                onSubmit={onSubmit}
                noValidate
              >
                <p className="eyebrow">فرم پیام</p>
                <h2 className="t-h3 mt-3">چطور می‌توانم کمک کنم؟</h2>
                <span className="rule-accent mt-5" />

                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="name">
                      نام و نام خانوادگی
                    </label>
                    <input
                      id="name"
                      name="name"
                      className="field"
                      required
                      autoComplete="name"
                    />
                    {error("name")}
                  </div>
                  <div>
                    <label className="field-label" htmlFor="email">
                      ایمیل
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="field"
                      required
                      dir="ltr"
                      autoComplete="email"
                    />
                    {error("email")}
                  </div>
                  <div>
                    <label className="field-label" htmlFor="phone">
                      تلفن (اختیاری)
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      className="field"
                      dir="ltr"
                      autoComplete="tel"
                    />
                    {error("phone")}
                  </div>
                  <div>
                    <label className="field-label" htmlFor="subject">
                      موضوع
                    </label>
                    <input id="subject" name="subject" className="field" />
                    {error("subject")}
                  </div>
                </div>

                <div className="mt-5">
                  <label className="field-label" htmlFor="message">
                    متن پیام
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    className="field min-h-40"
                    required
                  />
                  {error("message")}
                </div>

                {/* Honeypot: hidden from humans, tempting for bots. */}
                <div
                  className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                  aria-hidden="true"
                >
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? "در حال ارسال…" : "ارسال پیام"}
                  </button>
                  <p className="t-caption text-muted">
                    پاسخ‌دهی معمولاً ۲۴ تا ۴۸ ساعت کاری.
                  </p>
                </div>

                {message ? (
                  <p
                    className={
                      status === "error"
                        ? "t-small mt-6 text-accent"
                        : "t-small mt-6"
                    }
                    role={status === "error" ? "alert" : "status"}
                  >
                    {message}
                  </p>
                ) : null}
              </form>
            </Reveal>
          </div>
        </div>
      </div>
    </>
  );
}
