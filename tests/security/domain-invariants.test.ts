import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

const sql = readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql")).map((name) => readFileSync(`supabase/migrations/${name}`, "utf8")).join("\n").toLowerCase();

describe("domain integrity gates", () => {
  it("enforces immutable and hashed beat contracts", () => {
    expect(sql).toContain("prevent_beat_license_contract_mutation");
    expect(sql).toMatch(/contract_hash|sha256/);
  });

  it("implements double-entry financial invariants and reversal protection", () => {
    expect(sql).toContain("ledger_entries");
    expect(sql).toContain("assert_ledger_transaction_balanced");
    expect(sql).toMatch(/reversal|reverse/);
    expect(sql).toMatch(/idempotency/);
  });

  it("protects privileged RPCs from public execution", () => {
    expect(sql).toMatch(/revoke all on function public\.consume_api_rate_limit[\s\S]*from public, anon, authenticated/);
    expect(sql).toMatch(/revoke all on function public\.record_api_observation[\s\S]*from public, anon, authenticated/);
  });
});
