import { Suspense, lazy, useEffect } from "react"
import { Route, Routes, useLocation } from "react-router-dom"
import { Header } from "./components/Header"
import { Footer } from "./components/Footer"
import { IntroLoader } from "./components/IntroLoader"
import { ErrorState, PageSkeleton, Spinner } from "./components/Feedback"
import { SmoothScroll } from "./motion/SmoothScroll"
import { PageTransition } from "./motion/PageTransition"
import { applyBranding, resolveBranding } from "./lib/branding"
import { useBootstrap } from "./store/bootstrap"

/*
 * APP SHELL
 *
 * No visitor-facing theme, font, template or palette switcher, and no custom
 * cursor layer: the public site is exactly the designed site. Route-level code
 * splitting keeps the first paint small.
 */

const Home = lazy(() => import("./pages/Home"))
const Works = lazy(() => import("./pages/Works"))
const ArtworkDetail = lazy(() => import("./pages/ArtworkDetail"))
const Collections = lazy(() => import("./pages/Collections"))
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"))
const Exhibitions = lazy(() => import("./pages/Exhibitions"))
const About = lazy(() => import("./pages/About"))
const Resume = lazy(() => import("./pages/Resume"))
const Contact = lazy(() => import("./pages/Contact"))
const NotFound = lazy(() => import("./pages/NotFound"))
const AdminApp = lazy(() => import("./admin/AdminApp"))

function PublicShell() {
	return (
		<SmoothScroll>
			<a href="#main" className="skip-link">
				رفتن به محتوای اصلی
			</a>
			<Header />
			<main id="main">
				<PageTransition>
					<Suspense fallback={<PageSkeleton />}>
						<Routes>
							<Route path="/" element={<Home />} />
							<Route path="/artworks" element={<Works />} />
							<Route path="/artworks/:slug" element={<ArtworkDetail />} />
							<Route path="/collections" element={<Collections />} />
							<Route
								path="/collections/:slug"
								element={<CollectionDetail />}
							/>
							<Route path="/exhibitions" element={<Exhibitions />} />
							<Route path="/about" element={<About />} />
							<Route path="/resume" element={<Resume />} />
							<Route path="/contact" element={<Contact />} />
							<Route path="*" element={<NotFound />} />
						</Routes>
					</Suspense>
				</PageTransition>
			</main>
			<Footer />
		</SmoothScroll>
	)
}

export function App() {
	const { loading, error, site, artist, reload } = useBootstrap()
	const location = useLocation()
	const isAdmin = location.pathname.startsWith("/admin-panel")

	// Branding is pushed into <head> from Site Settings — the single source.
	useEffect(() => {
		if (!site) return
		applyBranding(resolveBranding(site, artist?.name))
	}, [artist?.name, site])

	if (error && !site) {
		return (
			<ErrorState
				title="اتصال به سرور برقرار نشد"
				body={error}
				onRetry={() => void reload()}
			/>
		)
	}

	if (site?.maintenance_mode && !isAdmin) {
		return (
			<div className="flex min-h-screen items-center justify-center p-8 text-center">
				<div>
					<p className="eyebrow">{site.site_name}</p>
					<h1 className="t-h1 mt-5">به‌زودی بازمی‌گردیم</h1>
					<p className="t-body mx-auto mt-5 max-w-md text-muted">
						{site.maintenance_message}
					</p>
				</div>
			</div>
		)
	}

	if (isAdmin) {
		return (
			<Suspense fallback={<Spinner label="بارگذاری پنل مدیریت…" />}>
				<Routes>
					<Route path="/admin-panel/*" element={<AdminApp />} />
				</Routes>
			</Suspense>
		)
	}

	return (
		<>
			{loading ? <IntroLoader /> : null}
			<PublicShell />
		</>
	)
}
