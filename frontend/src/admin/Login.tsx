import { useState } from "react"
import { useAuth } from "./auth"
import { useBootstrap } from "@/store/bootstrap"
import { resolveBranding } from "@/lib/branding"

/** Admin sign-in. Branding comes from site settings — nothing is hardcoded. */
export default function Login() {
	const { login } = useAuth()
	const { site, artist } = useBootstrap()
	const brand = resolveBranding(site, artist?.name)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState("")

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const form = new FormData(event.currentTarget)
		setBusy(true)
		setError("")
		try {
			await login(String(form.get("username")), String(form.get("password")))
		} catch {
			setError("نام کاربری یا گذرواژه درست نیست.")
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="grid min-h-screen bg-bg lg:grid-cols-[1fr_minmax(380px,460px)]">
			<aside className="hidden flex-col justify-between border-e border-line bg-surface2 p-14 lg:flex">
				<p className="eyebrow">{brand.siteName}</p>
				<div>
					<p className="t-h1 font-display">{brand.artistName}</p>
					{brand.tagline ? (
						<p className="t-body mt-5 max-w-sm text-muted">{brand.tagline}</p>
					) : null}
				</div>
				<p className="t-caption text-muted">پنل مدیریت محتوا</p>
			</aside>

			<main className="flex items-center justify-center p-6 sm:p-12">
				<form onSubmit={onSubmit} className="w-full max-w-sm" noValidate>
					<p className="eyebrow lg:hidden">{brand.siteName}</p>
					<h1 className="t-h2 mt-3 font-display">ورود به پنل</h1>
					<p className="t-small mt-3 text-muted">
						برای مدیریت آثار، رسانه و برند وارد شوید.
					</p>

					<div className="mt-9">
						<label className="field-label" htmlFor="username">
							نام کاربری
						</label>
						<input
							id="username"
							name="username"
							className="field"
							dir="ltr"
							required
							autoFocus
							autoComplete="username"
						/>
					</div>

					<div className="mt-6">
						<label className="field-label" htmlFor="password">
							گذرواژه
						</label>
						<input
							id="password"
							name="password"
							type="password"
							className="field"
							dir="ltr"
							required
							autoComplete="current-password"
						/>
					</div>

					<button
						type="submit"
						className="btn btn-primary mt-9 w-full justify-center"
						disabled={busy}
					>
						{busy ? "در حال ورود…" : "ورود"}
					</button>

					{error ? (
						<p className="t-small mt-5 text-accent" role="alert">
							{error}
						</p>
					) : null}

					<a href="/" className="t-caption mt-10 inline-block text-muted">
						<span className="link-u">بازگشت به سایت</span>
					</a>
				</form>
			</main>
		</div>
	)
}
