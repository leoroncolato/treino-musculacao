import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from "jose";
import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
import { identity } from "../worker/auth";
import worker, { sync, type Env } from "../worker/index";
import {
  importBackup,
  mergeRemote,
  resolveConflict,
  type RecordData,
} from "../src/lib/records";
import { workouts } from "../src/data/workout";
const env = {
  ACCESS_TEAM_DOMAIN: "test.cloudflareaccess.com",
  ACCESS_AUD: "test-audience",
  ALLOWED_EMAIL: "allowed@example.test",
};
const base: RecordData = {
  id: crypto.randomUUID(),
  session_id: crypto.randomUUID(),
  date: "2026-11-10",
  exercise: "press",
  day: 2,
  set_number: 1,
  load: 20,
  reps: 12,
  rir: 3,
  completed: true,
  note: "private",
  duration: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  version: 0,
};
describe("Access cryptographic authorization", () => {
  it("accepts only verified issuer, audience, signature, expiry and exact email", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "test";
    const key = createLocalJWKSet({ keys: [jwk] });
    const token = async (
      email: string,
      aud = env.ACCESS_AUD,
      exp = "5m",
      iss = `https://${env.ACCESS_TEAM_DOMAIN}`,
    ) =>
      new SignJWT({ email, type: "app" })
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setSubject("validated-sub")
        .setAudience(aud)
        .setIssuer(iss)
        .setIssuedAt()
        .setExpirationTime(exp)
        .sign(privateKey);
    const req = (jwt: string) =>
      new Request("https://app.test/api/sync/records", {
        headers: { "Cf-Access-Jwt-Assertion": jwt },
      });
    expect(await identity(req(await token(env.ALLOWED_EMAIL)), env, key)).toBe(
      "validated-sub",
    );
    for (const jwt of [
      await token("other@example.test"),
      await token("Allowed@example.test"),
      await token(env.ALLOWED_EMAIL, "bad"),
      await token(env.ALLOWED_EMAIL, env.ACCESS_AUD, "-1s"),
      await token(env.ALLOWED_EMAIL, env.ACCESS_AUD, "5m", "https://evil.test"),
      "forged",
    ])
      await expect(identity(req(jwt), env, key)).rejects.toThrow();
    await expect(
      identity(
        new Request("https://app.test", {
          headers: { "Cf-Access-Authenticated-User-Email": env.ALLOWED_EMAIL },
        }),
        env,
        key,
      ),
    ).rejects.toThrow();
  });
});
describe("local records", () => {
  it("retains both concurrent edits and resolves explicitly", () => {
    const local = { ...base, dirty: true, version: 1 };
    const remote = { ...base, version: 2, load: 40 };
    const merged = mergeRemote(local, remote);
    expect(merged.load).toBe(20);
    expect(merged.conflict?.load).toBe(40);
    expect(resolveConflict(merged, "local")).toMatchObject({
      load: 20,
      version: 2,
      dirty: true,
    });
    expect(resolveConflict(merged, "remote")).toMatchObject({
      load: 40,
      version: 2,
      dirty: false,
    });
  });
  it("round-trips backups, rejects malformed input and retains import conflicts", () => {
    const text = JSON.stringify({ format: "treino-bella-v1", records: [base] });
    expect(importBackup(text, [])[0]).toMatchObject({ ...base, dirty: true });
    expect(() => importBackup("{bad", [])).toThrow();
    expect(() =>
      importBackup(
        JSON.stringify({
          format: "treino-bella-v1",
          records: [{ ...base, load: -1 }],
        }),
        [],
      ),
    ).toThrow();
    expect(
      importBackup(text, [{ ...base, load: 10, dirty: true }])[0].conflict
        ?.load,
    ).toBe(20);
  });
  it("keeps five prescribed training days and no excluded movements", () => {
    expect(workouts.map((w) => w.day)).toEqual([2, 3, 4, 5, 6]);
    expect(
      workouts
        .filter((w) => w.exercises.some((e) => e.primary === "Core"))
        .map((w) => w.day),
    ).toEqual([3, 5]);
    for (const e of workouts.flatMap((w) => w.exercises)) {
      expect(e.name).not.toMatch(/stiff|romeno|búlgaro|agachamento livre/i);
      expect(e.instruction && e.safety && e.alternative).toBeTruthy();
    }
  });
});
describe("real local D1 database", () => {
  let mf: Miniflare;
  let binding: Env;
  beforeAll(async () => {
    mf = new Miniflare({
      enableDevRegistry: false,
      workers: [
        {
          config: {
            name: "test",
            compatibilityDate: "2026-11-04",
            manifest: {
              mainModule: "index.js",
              modules: {
                "index.js": {
                  type: "esm",
                  contents:
                    'export default {fetch(){return new Response("ok")}}',
                },
              },
            },
            env: { DB: { type: "d1", id: "test" } },
          },
        },
      ],
    });
    const db = await mf.getD1Database("DB");
    await db.exec(
      readFileSync("migrations/0001_records.sql", "utf8").replace(/\n/g, " "),
    );
    binding = {
      ...env,
      DB: db as unknown as D1Database,
      ASSETS: {
        fetch: async () => new Response("public"),
      } as unknown as Fetcher,
    };
  });
  afterAll(async () => {
    await mf.dispose();
  });
  const post = (r: RecordData[], origin = "https://app.test") =>
    new Request("https://app.test/api/sync/records", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ records: r }),
    });
  it("denies anonymous API before touching D1, serves public content", async () => {
    expect(
      (
        await worker.fetch(
          new Request("https://app.test/api/sync/records"),
          binding,
        )
      ).status,
    ).toBe(401);
    expect(
      await (
        await worker.fetch(new Request("https://app.test/"), binding)
      ).text(),
    ).toBe("public");
  });
  it("synchronizes devices, CAS conflicts, tombstones, idempotent retries and user isolation", async () => {
    const first = (await (
      await sync(post([base]), binding, "owner")
    ).json()) as { accepted: RecordData[] };
    expect(first.accepted[0].version).toBe(1);
    const pull = async (user: string) =>
      (await (
        await sync(
          new Request("https://app.test/api/sync/records"),
          binding,
          user,
        )
      ).json()) as { records: RecordData[] };
    expect((await pull("other")).records).toHaveLength(0);
    const deviceB = (await pull("owner")).records[0];
    const a = (await (
      await sync(post([{ ...first.accepted[0], load: 30 }]), binding, "owner")
    ).json()) as { accepted: RecordData[] };
    const b = (await (
      await sync(post([{ ...deviceB, load: 40 }]), binding, "owner")
    ).json()) as { conflicts: RecordData[] };
    expect(b.conflicts[0].load).toBe(30);
    const del = { ...a.accepted[0], deleted_at: new Date().toISOString() };
    await sync(post([del]), binding, "owner");
    expect((await pull("owner")).records[0].deleted_at).not.toBeNull();
    const retry = (await (
      await sync(post([del]), binding, "owner")
    ).json()) as { conflicts: RecordData[] };
    expect(retry.conflicts[0].version).toBe(3);
    expect(
      (await sync(post([base], "https://evil.test"), binding, "owner")).status,
    ).toBe(403);
    expect(
      (await sync(post([{ ...base, exercise: "invented" }]), binding, "owner"))
        .status,
    ).toBe(400);
  });
});
