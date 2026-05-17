/**
 * Build script: bundles widget-src/*.ts with ext-apps SDK into self-contained HTML widgets.
 * Uses esbuild to create an inline <script> bundle for each widget, then injects it into the HTML template.
 */
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDGET_SRC = path.join(__dirname, "widget-src");
const WIDGETS_OUT = path.join(__dirname, "widgets");

const widgets = [
  { src: "workday-form.ts", html: "workday-form.html", template: "workday-form.template.html" },
  { src: "grievance-intake.ts", html: "grievance-intake.html", template: "grievance-intake.template.html" },
  { src: "expense-report.ts", html: "expense-report.html", template: "expense-report.template.html" },
  { src: "completion-summary.ts", html: "completion-summary.html", template: "completion-summary.template.html" },
];

async function build() {
  for (const widget of widgets) {
    const entryPoint = path.join(WIDGET_SRC, widget.src);
    const templatePath = path.join(WIDGETS_OUT, widget.template);
    const outputPath = path.join(WIDGETS_OUT, widget.html);

    console.log(`Building ${widget.src} → ${widget.html}...`);

    // Bundle the TypeScript source with ext-apps SDK into a single IIFE
    const result = await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      format: "iife",
      platform: "browser",
      target: "es2020",
      write: false,
      minify: true,
    });

    const jsBundle = result.outputFiles[0].text;

    // Read the HTML template and inject the bundle
    const template = fs.readFileSync(templatePath, "utf-8");
    const finalHtml = template.replace("/* __WIDGET_BUNDLE__ */", jsBundle);

    fs.writeFileSync(outputPath, finalHtml, "utf-8");
    console.log(`  ✓ ${widget.html} (${(finalHtml.length / 1024).toFixed(1)} KB)`);
  }
  console.log("\nAll widgets built successfully!");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
