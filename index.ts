import { marked } from "marked";
import markedShiki from "marked-shiki";
import { createHighlighter } from "shiki";
import { watch } from "fs";
import { join } from "path";
import { generateJsonSchemas } from "./schemas";

const isDevMode = process.argv.includes("--dev");

const highlighter = await createHighlighter({
  themes: ["github-light", "github-dark"],
  langs: [
    "typescript",
    "javascript",
    "json",
    "bash",
    "shell",
    "markdown",
    "html",
    "css",
    "python",
    "rust",
    "go",
    "tsx",
    "jsx",
    "yaml",
    "text",
    "plaintext",
    "sql",
  ],
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

const imageDimensions: Record<string, { width: number; height: number }> = {
  "/assets/images/agent-trace-diagram.png": { width: 1600, height: 1290 },
  "/assets/images/agent-trace-diagram-dark.png": { width: 1600, height: 1290 },
};

const darkModeImages = new Set(["/assets/images/agent-trace-diagram.png"]);

const renderer = {
  heading({ tokens, depth }: { tokens: any[]; depth: number }) {
    const text = tokens.map((t: any) => t.raw || t.text || "").join("");
    const id = slugify(text);
    return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
  },
  image({ href, title, text }: { href: string; title: string | null; text: string }) {
    const dims = imageDimensions[href];
    const widthAttr = dims ? ` width="${dims.width}"` : "";
    const heightAttr = dims ? ` height="${dims.height}"` : "";
    const titleAttr = title ? ` title="${title}"` : "";
    
    if (darkModeImages.has(href)) {
      const darkHref = href.replace(/\.png$/, "-dark.png");
      const darkDims = imageDimensions[darkHref];
      const darkWidthAttr = darkDims ? ` width="${darkDims.width}"` : "";
      const darkHeightAttr = darkDims ? ` height="${darkDims.height}"` : "";
      
      return `<img src="${href}" alt="${text}"${titleAttr}${widthAttr}${heightAttr} loading="lazy" decoding="async" class="img-light"><img src="${darkHref}" alt="${text}"${titleAttr}${darkWidthAttr}${darkHeightAttr} loading="lazy" decoding="async" class="img-dark">`;
    }
    
    return `<img src="${href}" alt="${text}"${titleAttr}${widthAttr}${heightAttr} loading="lazy" decoding="async">`;
  },
};

marked.use({ gfm: true, renderer });
marked.use(
  markedShiki({
    highlight(code, lang) {
      return highlighter.codeToHtml(code, {
        lang: lang || "text",
        themes: {
          light: "github-light",
          dark: "github-dark",
        },
        defaultColor: false,
      });
    },
  })
);

const getStyles = () => `
@font-face {
  font-family: 'CursorGothic';
  src: url('/assets/fonts/CursorGothic-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'CursorGothic';
  src: url('/assets/fonts/CursorGothic-Italic.woff2') format('woff2');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

@font-face {
  font-family: 'CursorGothic';
  src: url('/assets/fonts/CursorGothic-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'CursorGothic';
  src: url('/assets/fonts/CursorGothic-BoldItalic.woff2') format('woff2');
  font-weight: 700;
  font-style: italic;
  font-display: swap;
}

@font-face {
  font-family: 'BerkeleyMono';
  src: url('/assets/fonts/BerkeleyMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'BerkeleyMono';
  src: url('/assets/fonts/BerkeleyMono-Oblique.woff2') format('woff2');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

:root {
  --font-sans: 'CursorGothic', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'BerkeleyMono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md-sm: 1.125rem;
  --text-md: 1.375rem;
  --text-md-lg: 1.625rem;
  --text-lg: 2.25rem;
  --text-xl: 3.25rem;

  --leading-tight: 1.1;
  --leading-snug: 1.25;
  --leading-snug-plus: 1.3;
  --leading-cozy: 1.4;
  --leading-normal: 1.5;

  --tracking-sm: 0.01em;
  --tracking-base: 0.005em;
  --tracking-md: -0.005em;
  --tracking-lg: -0.02em;

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --color-theme-bg: #f7f7f4;
  --color-theme-fg: #26251e;
  --color-theme-fg-02: #3b3a33;
  --color-theme-text-sec: rgba(38, 37, 30, 0.6);
  --color-theme-text-tertiary: rgba(38, 37, 30, 0.4);
  --color-theme-accent: #f54e00;
  --color-theme-card-hex: #f2f1ed;
  --color-theme-border-01: rgba(38, 37, 30, 0.025);
  --color-theme-border-02: rgba(38, 37, 30, 0.1);
  --color-theme-fg-02-5: rgba(38, 37, 30, 0.025);

  --v: calc(1rem * 1.4);
  --spacing-v1: var(--v);
  --spacing-v2: calc(var(--v) * 2);
  --spacing-v6-12: calc(var(--v) * 0.5);

  --radius-xs: 4px;

  --max-width-container: 700px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-theme-bg: #14120b;
    --color-theme-fg: #edecec;
    --color-theme-fg-02: #d7d6d5;
    --color-theme-text-sec: rgba(237, 236, 236, 0.6);
    --color-theme-text-tertiary: rgba(237, 236, 236, 0.4);
    --color-theme-card-hex: #1b1913;
    --color-theme-border-01: rgba(237, 236, 236, 0.025);
    --color-theme-border-02: rgba(237, 236, 236, 0.1);
    --color-theme-fg-02-5: rgba(237, 236, 236, 0.025);
  }
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-size: calc(15rem / 16);
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
}

@media (min-width: 900px) {
  html {
    font-size: 1rem;
  }
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--color-theme-bg);
  color: var(--color-theme-fg);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  letter-spacing: var(--tracking-base);
}

.container {
  margin-inline: auto;
  max-width: var(--max-width-container);
  width: 100%;
  padding: var(--spacing-v2) 1.5rem;
}

.header {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header img {
  height: 24px;
  width: auto;
}

.logo-light { display: block; }
.logo-dark { display: none; }

@media (prefers-color-scheme: dark) {
  .logo-light { display: none; }
  .logo-dark { display: block; }
}

.img-light { display: block; }
.img-dark { display: none; }

@media (prefers-color-scheme: dark) {
  .img-light { display: none; }
  .img-dark { display: block; }
}

.prose {
  color: var(--color-theme-fg);
}

.prose > *:first-child {
  margin-top: 0;
}

.prose h1 {
  font-size: var(--text-lg);
  line-height: var(--leading-tight);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-lg);
  margin-top: var(--spacing-v2);
  margin-bottom: var(--spacing-v1);
}

.prose h2 {
  font-size: var(--text-md);
  line-height: var(--leading-snug-plus);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-md);
  margin-top: var(--spacing-v2);
  margin-bottom: var(--spacing-v6-12);
}

.prose h3 {
  font-size: var(--text-md-sm);
  line-height: var(--leading-cozy);
  font-weight: var(--font-weight-bold);
  margin-top: calc(var(--v) * 1.5);
  margin-bottom: var(--spacing-v6-12);
}

.prose h4, .prose h5, .prose h6 {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  font-weight: var(--font-weight-bold);
  margin-top: var(--spacing-v1);
  margin-bottom: var(--spacing-v6-12);
}

.prose p {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  margin-top: 0;
  margin-bottom: var(--spacing-v1);
}

.prose a {
  color: currentColor;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.125em;
  text-decoration-color: rgba(currentColor, 0.5);
}

.prose a:hover {
  opacity: 0.75;
}

.prose strong {
  font-weight: var(--font-weight-bold);
}

.prose em {
  font-style: italic;
}

.prose code {
  background-color: var(--color-theme-card-hex);
  border: 1px solid var(--color-theme-border-01);
  border-radius: var(--radius-xs);
  color: var(--color-theme-fg);
  padding: 0.125em 0.25em;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.prose pre {
  background-color: var(--color-theme-fg-02-5);
  border-radius: var(--radius-xs);
  border: 1px solid var(--color-theme-border-01);
  padding: 1rem 1.25rem;
  margin-top: var(--spacing-v1);
  margin-bottom: var(--spacing-v1);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.prose pre::-webkit-scrollbar {
  display: none;
}

.prose pre code {
  background: transparent;
  border: none;
  padding: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-theme-fg);
}

.prose .shiki {
  background-color: var(--color-theme-fg-02-5) !important;
  border-radius: var(--radius-xs);
  border: 1px solid var(--color-theme-border-01);
  padding: 0.875rem 1rem;
  margin-top: var(--spacing-v1);
  margin-bottom: var(--spacing-v1);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.4;
}

.prose .shiki::-webkit-scrollbar {
  display: none;
}

.prose .shiki code {
  background: transparent;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

@media (prefers-color-scheme: light) {
  .shiki,
  .shiki span {
    color: var(--shiki-light) !important;
    background-color: transparent !important;
  }
}

@media (prefers-color-scheme: dark) {
  .shiki,
  .shiki span {
    color: var(--shiki-dark) !important;
    background-color: transparent !important;
  }
}

.prose ul, .prose ol {
  padding-left: 1.5rem;
  margin-top: 0;
  margin-bottom: var(--spacing-v1);
}

.prose ul {
  list-style-type: square;
}

.prose ol {
  list-style-type: decimal;
}

.prose li {
  margin-bottom: 0.25rem;
}

.prose li::marker {
  color: var(--color-theme-text-tertiary);
}

.prose ul ul, .prose ul ol, .prose ol ul, .prose ol ol {
  margin-bottom: 0;
}

.prose blockquote {
  padding-left: 1rem;
  margin: var(--spacing-v1) 0;
  font-style: italic;
  color: var(--color-theme-fg);
  border-left: 2px solid var(--color-theme-border-02);
}

.prose blockquote p {
  margin-bottom: 0;
}

.prose hr {
  border: none;
  border-top: 1px solid var(--color-theme-border-02);
  margin: var(--spacing-v2) 0;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--spacing-v1) 0;
  font-size: var(--text-sm);
}

.prose thead {
  border-bottom: 1px solid var(--color-theme-border-02);
}

.prose th {
  font-weight: var(--font-weight-bold);
  text-align: left;
  padding: 0.5rem;
}

.prose th:first-child {
  padding-left: 0;
}

.prose tbody tr {
  border-bottom: 1px solid var(--color-theme-border-02);
}

.prose tbody tr:last-child {
  border-bottom: none;
}

.prose td {
  padding: 0.5rem;
  vertical-align: baseline;
}

.prose td:first-child {
  padding-left: 0;
}

.prose img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-xs);
}
`;

const getTemplate = (content: string, title: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#f7f7f4" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#14120b" media="(prefers-color-scheme: dark)">
  <title>${title}</title>
  <meta name="description" content="A standard format for tracking AI-generated code.">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="A standard format for tracking AI-generated code.">
  <meta property="og:image" content="https://agent-trace.dev/assets/images/agent-trace.png">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="A standard format for tracking AI-generated code.">
  <meta name="twitter:image" content="https://agent-trace.dev/assets/images/agent-trace.png">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/CursorGothic-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/CursorGothic-Bold.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/BerkeleyMono-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <style>${getStyles()}</style>
</head>
<body>
  <header class="header">
    <img src="/assets/logo/lockup-swap-light-theme.svg" alt="Cursor" class="logo-light">
    <img src="/assets/logo/lockup-swap-dark-theme.svg" alt="Cursor" class="logo-dark">
  </header>
  <main class="container">
    <article class="prose">
      ${content}
    </article>
  </main>
</body>
</html>`;

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1] : "Agent Trace";
}

async function build() {
  console.log("Building...");

  const readme = await Bun.file("README.md").text();
  const htmlContent = await marked(readme);
  const title = extractTitle(readme);
  const page = getTemplate(htmlContent, title);

  await Bun.write("dist/.gitkeep", "");
  await Bun.write("dist/index.html", page);

  const assetsDir = "assets";
  const distAssetsDir = "dist/assets";
  const fontsDir = join(assetsDir, "fonts");
  const distFontsDir = join(distAssetsDir, "fonts");
  await Bun.write(`${distFontsDir}/.gitkeep`, "");

  for (const font of [
    "CursorGothic-Regular.woff2",
    "CursorGothic-Bold.woff2",
    "CursorGothic-Italic.woff2",
    "CursorGothic-BoldItalic.woff2",
    "BerkeleyMono-Regular.woff2",
    "BerkeleyMono-Oblique.woff2",
  ]) {
    const src = join(fontsDir, font);
    const dest = join(distFontsDir, font);
    const file = await Bun.file(src).arrayBuffer();
    await Bun.write(dest, file);
  }

  const logoDir = join(assetsDir, "logo");
  const distLogoDir = join(distAssetsDir, "logo");
  await Bun.write(`${distLogoDir}/.gitkeep`, "");

  for (const logo of [
    "lockup-swap-dark-theme.svg",
    "lockup-swap-light-theme.svg",
  ]) {
    const src = join(logoDir, logo);
    const dest = join(distLogoDir, logo);
    const file = await Bun.file(src).text();
    await Bun.write(dest, file);
  }

  // Copy favicon
  const faviconSrc = join(assetsDir, "images", "favicon-light.svg");
  const faviconDest = "dist/favicon.svg";
  const faviconFile = await Bun.file(faviconSrc).text();
  await Bun.write(faviconDest, faviconFile);

  // Copy images (OG image, etc.)
  const imagesDir = join(assetsDir, "images");
  const distImagesDir = join(distAssetsDir, "images");
  await Bun.write(`${distImagesDir}/.gitkeep`, "");

  for (const image of ["agent-trace.png", "agent-trace-diagram.png", "agent-trace-diagram-dark.png"]) {
    const src = join(imagesDir, image);
    const dest = join(distImagesDir, image);
    const file = await Bun.file(src).arrayBuffer();
    await Bun.write(dest, file);
  }

  // Build JSON schemas
  const schemasDir = "dist/schemas/v1";
  await Bun.write(`${schemasDir}/.gitkeep`, "");

  const schemas = generateJsonSchemas();
  for (const [filename, schema] of Object.entries(schemas)) {
    await Bun.write(
      join(schemasDir, filename),
      JSON.stringify(schema, null, 2)
    );
  }

  console.log(`Build complete! Output: dist/index.html + ${Object.keys(schemas).length} schemas`);
}

async function startDevServer() {
  const server = Bun.serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);
      let path = url.pathname;
      if (path === "/") path = "/index.html";

      const filePath = join("dist", path);

      try {
        const file = Bun.file(filePath);
        const exists = await file.exists();
        if (!exists) return new Response("Not Found", { status: 404 });

        let contentType = "text/html";
        if (path.endsWith(".css")) contentType = "text/css";
        else if (path.endsWith(".js")) contentType = "application/javascript";
        else if (path.endsWith(".svg")) contentType = "image/svg+xml";
        else if (path.endsWith(".woff2")) contentType = "font/woff2";
        else if (path.endsWith(".png")) contentType = "image/png";
        else if (path.endsWith(".jpg") || path.endsWith(".jpeg"))
          contentType = "image/jpeg";

        return new Response(file, {
          headers: { "Content-Type": contentType },
        });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    },
  });

  console.log(`Dev server running at http://localhost:${server.port}`);

  const watcher = watch(".", { recursive: true }, async (event, filename) => {
    if (
      filename &&
      !filename.startsWith("dist") &&
      !filename.startsWith("node_modules") &&
      !filename.startsWith(".")
    ) {
      console.log(`File changed: ${filename}`);
      await build();
    }
  });

  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    watcher.close();
    process.exit(0);
  });
}

await build();

if (isDevMode) {
  await startDevServer();
}
