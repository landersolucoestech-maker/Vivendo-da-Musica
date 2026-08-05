import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const openapi = readFileSync("supabase/functions/api-v1/openapi.yaml", "utf8");
const handler = readFileSync("supabase/functions/api-v1/index.ts", "utf8");
const apiShared = readFileSync("supabase/functions/_shared/api.ts", "utf8");

describe("API v1 contract", () => {
  it("publishes a versioned OpenAPI 3.1 contract", () => {
    expect(openapi).toContain("openapi: 3.1.0");
    expect(openapi).toContain("/catalog/{resource}");
    expect(openapi).toContain("/webhooks/{provider}");
  });

  it("caps pagination and allowlists catalog resources", () => {
    expect(apiShared).toContain("rawLimit > 100");
    for (const resource of ["courses", "beats", "events", "opportunities"]) expect(handler).toContain(`${resource}: {`);
  });

  it("returns traceable structured errors", () => {
    expect(apiShared).toContain('"X-Request-Id"');
    expect(apiShared).toContain('"X-Error-Code"');
    expect(handler).toContain('event: "api.request.completed"');
  });

  it("requires signed, byte-limited and idempotent webhook delivery", () => {
    expect(handler).toContain("hmacSha256(secret, rawBody)");
    expect(handler).toContain("const MAX_WEBHOOK_BYTES = 1_048_576;");
    expect(handler).toContain("totalBytes > maxBytes");
    expect(handler).toContain("readTextWithLimit(req, MAX_WEBHOOK_BYTES)");
    expect(handler).toContain('error?.code === "23505"');
  });
});
