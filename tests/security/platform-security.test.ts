import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function files(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const sourceFiles = files("src").filter((file) => /\.(ts|tsx)$/.test(file));
const migrations = files("supabase/migrations").filter((file) => file.endsWith(".sql")).map((file) => readFileSync(file, "utf8")).join("\n").toLowerCase();

describe("security gates", () => {
  it("never exposes privileged Supabase keys in browser source", () => {
    for (const file of sourceFiles) {
      const content = readFileSync(file, "utf8");
      expect(content, file).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i);
    }
  });

  it("does not use user metadata roles for authorization", () => {
    expect(migrations).not.toMatch(/raw_user_meta_data\s*->>?\s*'role'/);
    expect(migrations).not.toMatch(/auth\.jwt\(\)\s*->\s*'user_metadata'[\s\S]{0,100}role/);
  });

  it("enables RLS for sensitive financial, license and observability tables", () => {
    for (const table of ["ledger_entries", "beat_license_purchases", "observability_request_traces", "webhook_receipts"]) {
      expect(migrations).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("keeps download buckets private and delivery signed", () => {
    expect(migrations).toMatch(/'beat-masters',\s*'beat-masters',\s*false/);
    expect(migrations).toMatch(/'beat-stems',\s*'beat-stems',\s*false/);
    for (const fn of ["get-beat-download-url", "get-digital-product-download-url", "get-signed-lesson-url"]) {
      const content = readFileSync(`supabase/functions/${fn}/index.ts`, "utf8");
      expect(content).toMatch(/getAuthContext|auth\.getUser/);
      expect(content).toMatch(/createSignedUrl|createSignedUrls/);
    }
  });
});
