import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
	plugins: [react()],
	resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
	server: {
		host: "0.0.0.0",
		port: 5173,
		// behind nginx in docker
		watch: { usePolling: true },
		hmr: { clientPort: Number(process.env.HMR_CLIENT_PORT || 8080) },
	},
	build: {
		outDir: "dist",
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks: {
					react: ["react", "react-dom", "react-router-dom"],
					motion: ["gsap", "lenis"],
				},
			},
		},
	},
})
