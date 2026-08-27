import { useState } from "react"
import { useApi } from "@/hooks/useApi"
import { AdminHeader, AdminPanel } from "./Layout"
import { SortableList } from "./SortableList"
import { EmptyState, ErrorState, Spinner } from "@/components/Feedback"
import { api, ApiError } from "@/lib/api"
import { useBootstrap } from "@/store/bootstrap"
import type { NavItem, Paginated } from "@/lib/types"

/**
 * MENUS & SOCIAL LINKS
 *
 * Every action below maps to a real endpoint:
 * `/navigation/` (CRUD + `reorder/`) and `/social-links/` (CRUD + `reorder/`).
 * After each write the public bootstrap is reloaded so header/footer update.
 */

const LOCATIONS: Array<[string, string]> = [
	["header", "منوی بالا"],
	["mobile", "منوی موبایل"],
	["footer", "فوتر"],
]

type Social = {
	id: number
	label: string
	url: string
	platform?: string
	is_active?: boolean
	order: number
}

function asList<T>(data: Paginated<T> | T[] | null | undefined): T[] {
	if (!data) return []
	return Array.isArray(data) ? data : (data.results ?? [])
}

export default function NavigationAdmin() {
	const { reload } = useBootstrap()
	const [location, setLocation] = useState("header")
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState<string | null>(null)

	const nav = useApi<Paginated<NavItem> | NavItem[]>(
		"/navigation/",
		{ page_size: 100 },
		true,
	)
	const social = useApi<Paginated<Social> | Social[]>(
		"/social-links/",
		{ page_size: 100 },
		true,
	)

	const items = asList<NavItem>(nav.data)
		.filter((item) => item.location === location)
		.sort((a, b) => a.order - b.order)
	const socials = asList<Social>(social.data)
		.slice()
		.sort((a, b) => a.order - b.order)

	const act = async (fn: () => Promise<unknown>, refetch: () => unknown) => {
		setBusy(true)
		setMessage(null)
		try {
			await fn()
			await refetch()
			await reload()
		} catch (err) {
			setMessage(
				err instanceof ApiError
					? err.fieldLines.join(" ")
					: "ذخیره‌ی تغییرات ناموفق بود.",
			)
		} finally {
			setBusy(false)
		}
	}

	const navAct = (fn: () => Promise<unknown>) => act(fn, nav.refetch)
	const socialAct = (fn: () => Promise<unknown>) => act(fn, social.refetch)

	return (
		<>
			<AdminHeader
				title="منوها و شبکه‌ها"
				subtitle="عنوان، نشانی، ترتیب و وضعیت هر آیتم"
			/>

			{message ? (
				<p className="t-small mb-5 text-accent" role="alert">
					{message}
				</p>
			) : null}

			<AdminPanel
				title="آیتم‌های منو"
				description="با درگ کردن می‌توانید ترتیب را تغییر دهید."
			>
				<div className="mb-6 flex flex-wrap gap-3">
					{LOCATIONS.map(([value, label]) => (
						<button
							key={value}
							type="button"
							className="btn btn-ghost"
							aria-pressed={value === location}
							style={
								value === location
									? {
											borderColor: "var(--text)",
											backgroundColor: "var(--surface-2)",
										}
									: undefined
							}
							onClick={() => setLocation(value)}
						>
							{label}
						</button>
					))}
				</div>

				{nav.loading ? (
					<Spinner label="دریافت منوها…" />
				) : nav.error ? (
					<ErrorState
						title="منوها دریافت نشدند"
						body={nav.error}
						onRetry={() => void nav.refetch()}
					/>
				) : !items.length ? (
					<EmptyState
						title="این جایگاه خالی است"
						body="از فرم پایین اولین آیتم را برای این جایگاه اضافه کنید."
					/>
				) : (
					<div
						className={busy ? "pointer-events-none opacity-60" : undefined}
						aria-busy={busy}
					>
						<SortableList
							items={items}
							onReorder={(ids) =>
								void navAct(() =>
									api.admin.post("/navigation/reorder/", { order: ids }),
								)
							}
							renderItem={(item) => (
								<div className="flex flex-wrap items-center gap-4">
									<input
										className="field max-w-44 !py-2"
										defaultValue={item.label}
										aria-label="عنوان آیتم"
										onBlur={(event) =>
											event.target.value !== item.label
												? void navAct(() =>
														api.admin.patch(`/navigation/${item.id}/`, {
															label: event.target.value,
														}),
													)
												: undefined
										}
									/>
									<input
										className="field max-w-52 !py-2"
										defaultValue={item.url}
										dir="ltr"
										aria-label="نشانی"
										onBlur={(event) =>
											event.target.value !== item.url
												? void navAct(() =>
														api.admin.patch(`/navigation/${item.id}/`, {
															url: event.target.value,
														}),
													)
												: undefined
										}
									/>
									<button
										type="button"
										className="btn btn-ghost"
										onClick={() =>
											void navAct(() =>
												api.admin.patch(`/navigation/${item.id}/`, {
													is_active: !item.is_active,
												}),
											)
										}
									>
										{item.is_active ? "فعال" : "غیرفعال"}
									</button>
									<button
										type="button"
										className="btn btn-ghost"
										onClick={() => {
											if (window.confirm(`حذف «${item.label}»؟`)) {
												void navAct(() =>
													api.admin.delete(`/navigation/${item.id}/`),
												)
											}
										}}
									>
										حذف
									</button>
								</div>
							)}
						/>
					</div>
				)}
			</AdminPanel>

			<AdminPanel title="افزودن آیتم تازه">
				<form
					className="flex flex-wrap items-end gap-5"
					onSubmit={(event) => {
						event.preventDefault()
						const form = event.currentTarget
						const values = new FormData(form)
						void navAct(async () => {
							await api.admin.post("/navigation/", {
								label: values.get("label"),
								url: values.get("url"),
								location,
								is_active: true,
							})
							form.reset()
						})
					}}
				>
					<div>
						<label className="field-label" htmlFor="nav-label">
							عنوان
						</label>
						<input id="nav-label" name="label" className="field" required />
					</div>
					<div>
						<label className="field-label" htmlFor="nav-url">
							نشانی
						</label>
						<input
							id="nav-url"
							name="url"
							className="field"
							dir="ltr"
							placeholder="/artworks"
							required
						/>
					</div>
					<button type="submit" className="btn btn-primary" disabled={busy}>
						افزودن
					</button>
				</form>
			</AdminPanel>

			<AdminPanel
				title="شبکه‌های اجتماعی"
				description="این لینک‌ها در فوتر و صفحه‌ی تماس نمایش داده می‌شوند."
			>
				{social.loading ? (
					<Spinner label="دریافت لینک‌ها…" />
				) : social.error ? (
					<ErrorState
						title="لینک‌ها دریافت نشدند"
						body={social.error}
						onRetry={() => void social.refetch()}
					/>
				) : (
					<>
						{socials.length ? (
							<ul className="divide-y divide-line">
								{socials.map((item) => (
									<li
										key={item.id}
										className="flex flex-wrap items-center gap-4 py-4 first:pt-0"
									>
										<input
											className="field max-w-40 !py-2"
											defaultValue={item.label}
											aria-label="عنوان شبکه"
											onBlur={(event) =>
												event.target.value !== item.label
													? void socialAct(() =>
															api.admin.patch(`/social-links/${item.id}/`, {
																label: event.target.value,
															}),
														)
													: undefined
											}
										/>
										<input
											className="field max-w-56 !py-2"
											defaultValue={item.url}
											dir="ltr"
											aria-label="نشانی شبکه"
											onBlur={(event) =>
												event.target.value !== item.url
													? void socialAct(() =>
															api.admin.patch(`/social-links/${item.id}/`, {
																url: event.target.value,
															}),
														)
													: undefined
											}
										/>
										<button
											type="button"
											className="btn btn-ghost"
											onClick={() => {
												if (window.confirm(`حذف «${item.label}»؟`)) {
													void socialAct(() =>
														api.admin.delete(`/social-links/${item.id}/`),
													)
												}
											}}
										>
											حذف
										</button>
									</li>
								))}
							</ul>
						) : (
							<p className="t-small text-muted">هنوز لینکی ثبت نشده است.</p>
						)}

						<form
							className="mt-6 flex flex-wrap items-end gap-5"
							onSubmit={(event) => {
								event.preventDefault()
								const form = event.currentTarget
								const values = new FormData(form)
								void socialAct(async () => {
									await api.admin.post("/social-links/", {
										label: values.get("label"),
										url: values.get("url"),
										platform: values.get("platform") || "website",
										is_active: true,
									})
									form.reset()
								})
							}}
						>
							<div>
								<label className="field-label" htmlFor="social-label">
									عنوان
								</label>
								<input
									id="social-label"
									name="label"
									className="field"
									required
								/>
							</div>
							<div>
								<label className="field-label" htmlFor="social-platform">
									پلتفرم
								</label>
								<input
									id="social-platform"
									name="platform"
									className="field"
									dir="ltr"
									placeholder="instagram"
								/>
							</div>
							<div>
								<label className="field-label" htmlFor="social-url">
									نشانی
								</label>
								<input
									id="social-url"
									name="url"
									className="field"
									dir="ltr"
									placeholder="https://…"
									required
								/>
							</div>
							<button type="submit" className="btn btn-primary" disabled={busy}>
								افزودن لینک
							</button>
						</form>
					</>
				)}
			</AdminPanel>
		</>
	)
}
