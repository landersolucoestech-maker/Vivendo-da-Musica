import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const distAssets = "dist/assets";
const jsFiles = readdirSync(distAssets).filter((name) => name.endsWith(".js"));
const maximumChunkBytes = 500 * 1024;
const oversized = jsFiles.map((name) => ({ name, bytes: statSync(join(distAssets, name)).size })).filter((file) => file.bytes > maximumChunkBytes);
if (oversized.length) throw new Error(`Chunks above 500 KiB: ${oversized.map((file) => `${file.name} (${file.bytes})`).join(", ")}`);

const indexHtml = readFileSync("dist/index.html", "utf8");
if (!indexHtml.includes('name="viewport"')) throw new Error("Production HTML is missing the viewport meta tag.");
if (!indexHtml.includes("/assets/")) throw new Error("Production HTML does not reference built assets.");

console.log(JSON.stringify({ gate: "performance", status: "passed", chunks: jsFiles.length, maximum_chunk_kib: Math.round(Math.max(...jsFiles.map((name) => statSync(join(distAssets, name)).size)) / 1024) }));
