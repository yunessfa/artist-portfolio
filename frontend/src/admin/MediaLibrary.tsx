import { useCallback, useEffect, useState } from "react"
import { useApi } from "@/hooks/useApi"
import { AdminHeader, AdminPanel } from "./Layout"
import { SmartImage } from "@/components/SmartImage"
import {
	EmptyState,
	ErrorState,
	GridSkeleton,
	Spinner,
} from "@/components/Feedback"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/format"
import type { MediaAsset, Paginated } from "@/lib/types"

/**
 * MEDIA LIBRARY
 *
 * Real multipart uploads to `POST /media/`, inline metadata saves via PATCH,
 * deletes via DELETE, and the server's own constraints read from
 * `GET /media/limits/` so the UI never invents its own rules.
 */

type Limits = {
	max_upload_size_mb: number
	allowed_extensions: string[]
	allowed_mime_types?: string[]
}

export default function MediaLibrary() {
	const [search, setSearch] = useState("")
	const [query, setQuery] = useState("")
	const [busy, setBusy] = useState(false)
	const [progress, setProgress] = useState<string | null>(null)
	const [uploadError, setUploadError] = useState<string | null>(null)
	const [savedId, setSavedId] = useState<number | null>(null)

	// Debounce the search box so typing does not hammer the API.
	useEffect(() => {
		const id = window.setTimeout(() => setQuery(search.trim()), 300)
		return () => window.clearTimeout(id)
	}, [search])

	const { data, loading, error, refetch } = useApi<Paginated<MediaAsset>>(
		"/media/",
		{ page_size: 60, search: query || undefined },
		true,
	)
	const { data: limits } = useApi<Limits>("/media/limits/", undefined, true)

	const upload = useCallback(
		async (files: FileList | File[] | null) => {
			const list = files ? Array.from(files) : []
			if (!list.length) return
			setBusy(true)
			setUploadError(null)
			try {
				let done = 0
				for (const file of list) {
					done += 1
					setProgress(
						`در حال بارگزاری ${toPersianDigits(done)} از ${toPersianDigits(
							list.length,
						)}…`,
					)
					await api.admin.upload<MediaAsset>("/media/", {
						file,
						kind: "image",
						title: file.name.replace(/\.[^.]+$/, ""),
					})
				}
				await refetch()
			} catch (err) {
				setUploadError(
					err instanceof ApiError
						? err.fieldLines.join(" ")
						: "بارگزاری فایل ناموفق بود.",
				)
			} finally {
				setBusy(false)
				setProgress(null)
			}
		},
		[refetch],
	)

	const saveField = async (
		asset: MediaAsset,
		field: "title" | "alt_text",
		value: string,
	) => {
		if ((asset[field] ?? "") === value) return
		try {
			await api.admin.patch(`/media/${asset.id}/`, { [field]: value })
			setSavedId(asset.id)
			window.setTimeout(() => setSavedId(null), 1600)
		} catch {
			setUploadError("ذخیره‌ی اطلاعات فایل ناموفق بود.")
		}
	}

	const remove = async (asset: MediaAsset) => {
		const used = asset.usage_count ?? 0
		const message = used
			? `این فایل در ${toPersianDigits(used)} جا استفاده شده است. باز هم حذف شود؟`
			: "این فایل حذف شود؟"
		if (!window.confirm(message)) return
		try {
			await api.admin.delete(`/media/${asset.id}/`)
			await refetch()
		} catch (err) {
			setUploadError(
				err instanceof ApiError ? err.fieldLines.join(" ") : "حذف ناموفق بود.",
			)
		}
	}

	const assets = data?.results ?? []
	const hint = limits
		? `حداکثر ${toPersianDigits(limits.max_upload_size_mb)} مگابایت — ${limits.allowed_extensions.join(
				"، ",
			)}`
		: undefined

	return (
		<>
			<AdminHeader
				title="کتابخانه‌ی رسانه"
				subtitle="بارگزاری، جستجو، ویرایش متن جایگزین و حذف فایل‌ها"
				action={
					<label className="btn btn-accent cursor-pointer">
						{busy ? "در حال بارگزاری…" : "بارگزاری فایل"}
						<input
							type="file"
							multiple
							accept="image/*"
							className="hidden"
							disabled={busy}
							onChange={(event) => {
								void upload(event.target.files)
								event.target.value = ""
							}}
						/>
					</label>
				}
			/>

			<AdminPanel>
				<div className="flex flex-wrap items-center gap-4">
					<input
						className="field max-w-xs"
						placeholder="جستجوی عنوان یا متن جایگزین…"
						value={search}
						aria-label="جستجو در رسانه‌ها"
						onChange={(event) => setSearch(event.target.value)}
					/>
					{hint ? <span className="t-caption text-muted">{hint}</span> : null}
				</div>

				<div
					className="mt-5 border border-dashed border-line px-6 py-8 text-center"
					onDragOver={(event) => event.preventDefault()}
					onDrop={(event) => {
						event.preventDefault()
						void upload(event.dataTransfer.files)
					}}
				>
					{busy ? (
						<Spinner label={progress ?? "در حال بارگزاری…"} />
					) : (
						<p className="t-small text-muted">
							فایل‌ها را اینجا رها کنید یا از دکمه‌ی بالا استفاده کنید.
						</p>
					)}
				</div>

				{uploadError ? (
					<p className="t-small mt-4 text-accent">{uploadError}</p>
				) : null}
			</AdminPanel>

			{loading ? (
				<GridSkeleton count={8} />
			) : error ? (
				<ErrorState
					title="فایل‌ها دریافت نشدند"
					body={error}
					onRetry={() => void refetch()}
				/>
			) : !assets.length ? (
				<EmptyState
					title={
						query ? "فایلی مطابق جستجو پیدا نشد" : "کتابخانه خالی است"
					}
					body="تصویرهای آثار، پرتره و دارایی‌های برند از اینجا مدیریت می‌شوند."
				/>
			) : (
				<div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
					{assets.map((asset) => (
						<figure key={asset.id} className="card-flat overflow-hidden">
							<div className="media">
								<SmartImage asset={asset} ratio={1} objectFit="cover" />
							</div>
							<figcaption className="space-y-3 p-4">
								<input
									className="field !py-2 text-[0.85rem]"
									defaultValue={asset.title}
									aria-label="عنوان فایل"
									placeholder="عنوان"
									onBlur={(event) =>
										void saveField(asset, "title", event.target.value)
									}
								/>
								<input
									className="field !py-2 text-[0.85rem]"
									defaultValue={asset.alt_text}
									placeholder="متن جایگزین (دسترسی‌پذیری)"
									aria-label="متن جایگزین"
									onBlur={(event) =>
										void saveField(asset, "alt_text", event.target.value)
									}
								/>
								<div className="t-caption flex items-center justify-between text-muted">
									<span dir="ltr">
										{toPersianDigits(asset.width ?? 0)}×
										{toPersianDigits(asset.height ?? 0)}
									</span>
									<span>
										{savedId === asset.id
											? "ذخیره شد"
											: `استفاده: ${toPersianDigits(asset.usage_count ?? 0)}`}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<a
										href={asset.url}
										target="_blank"
										rel="noreferrer"
										className="t-caption"
									>
										<span className="link-u">مشاهده‌ی اندازه‌ی اصلی</span>
									</a>
									<button
										type="button"
										className="t-caption text-accent"
										onClick={() => void remove(asset)}
									>
										<span className="link-u">حذف</span>
									</button>
								</div>
							</figcaption>
						</figure>
					))}
				</div>
			)}
		</>
	)
}
