import { defineConfig } from "vite";

// Vite tags production module scripts with `crossorigin`, which triggers a
// CORS-checked fetch. Under Tauri's `tauri://localhost` custom protocol the
// packaged webview then refuses to run the bundle (works in dev, fails when
// built). Strip the attribute so the embedded assets load.
const stripCrossorigin = {
  name: "strip-crossorigin",
  transformIndexHtml(html) {
    return html.replace(/\s+crossorigin/g, "");
  },
};

export default defineConfig({
  plugins: [stripCrossorigin],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
  },
});
