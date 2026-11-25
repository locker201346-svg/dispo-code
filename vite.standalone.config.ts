// Baut die App als einzelne HTML-Datei (dist-standalone/dispo.html),
// die ohne Server direkt per Doppelklick im Browser geöffnet werden kann.
//   npm run build:standalone   → dispo.html (Version 1) und dispo-v2.html (Version 2)
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Fügt JS und CSS direkt in die HTML-Datei ein (keine externen Dateien nötig).
function inlineAll(outName: string): Plugin {
  return {
    name: "inline-all",
    enforce: "post",
    generateBundle(_opts, bundle) {
      const html = Object.values(bundle).find(
        (f) => f.type === "asset" && f.fileName.endsWith(".html"),
      );
      if (!html || html.type !== "asset") return;
      let src = String(html.source);

      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === "asset" && name.endsWith(".css")) {
          const css = String(file.source);
          const re = new RegExp(`<link[^>]*href="[^"]*${escapeRe(name)}"[^>]*>`);
          src = src.replace(re, () => `<style>${css}</style>`);
          delete bundle[name];
        }
      }

      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === "chunk") {
          const code = file.code.replace(/<\/script/gi, "<\\/script");
          const re = new RegExp(`<script[^>]*src="[^"]*${escapeRe(name)}"[^>]*></script>`);
          src = src.replace(re, () => "");
          src = src.replace("</body>", () => `<script>${code}</script>\n</body>`);
          delete bundle[name];
        }
      }

      html.source = src;
      html.fileName = outName;
    },
  };
}

// --mode v2 baut Version 2, sonst Version 1
export default defineConfig(({ mode }) => {
  const v2 = mode === "v2";
  const root = fileURLToPath(new URL("./standalone", import.meta.url));
  return {
    root,
    base: "./",
    plugins: [react(), tailwindcss(), inlineAll(v2 ? "dispo-v2.html" : "dispo.html")],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    build: {
      outDir: fileURLToPath(new URL("./dist-standalone", import.meta.url)),
      emptyOutDir: false,
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      modulePreload: false,
      rollupOptions: {
        input: `${root}/${v2 ? "index-v2.html" : "index.html"}`,
        output: { format: "iife" },
      },
    },
  };
});
