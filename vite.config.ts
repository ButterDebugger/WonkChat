import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		target: "es2022",
		outDir: resolve(process.cwd(), "dist"),
		sourcemap: true,
	},
	publicDir: resolve(process.cwd(), "static"),
	root: resolve(process.cwd(), "public"),
	appType: "spa",
	plugins: [react()],
});