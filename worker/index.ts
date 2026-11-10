import { identity, type AuthEnv } from "./auth";
import { recordSchema, type RecordData } from "../src/lib/records";
import { workouts } from "../src/data/workout";
import { z } from "zod";
export interface Env extends AuthEnv {
  DB: D1Database;
  ASSETS: Fetcher;
}
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
    },
  });
function decode(row: Record<string, unknown>): RecordData {
  const { user_id: _user, ...data } = row;
  void _user;
  return recordSchema.parse({ ...data, completed: Boolean(data.completed) });
}
export async function sync(
  request: Request,
  env: Env,
  user: string,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/sync/login" && request.method === "GET")
    return Response.redirect(`${url.origin}/?connected=1`, 303);
  if (url.pathname !== "/api/sync/records")
    return json({ error: "not_found" }, 404);
  if (request.method === "GET") {
    const cursor = url.searchParams.get("cursor") ?? "";
    if (cursor.length > 36) return json({ error: "invalid_cursor" }, 400);
    const { results } = await env.DB.prepare(
      "SELECT * FROM records WHERE user_id = ? AND id > ? ORDER BY id LIMIT 200",
    )
      .bind(user, cursor)
      .all<Record<string, unknown>>();
    return json({
      records: results.map(decode),
      next: results.length === 200 ? results.at(-1)!.id : null,
    });
  }
  if (request.method !== "POST")
    return json({ error: "method_not_allowed" }, 405);
  if (request.headers.get("Origin") !== url.origin)
    return json({ error: "origin_rejected" }, 403);
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    return json({ error: "json_required" }, 415);
  if (Number(request.headers.get("Content-Length") ?? 0) > 300000)
    return json({ error: "too_large" }, 413);
  const body = await request.text();
  if (body.length > 300000) return json({ error: "too_large" }, 413);
  const parsed = z
    .object({ records: z.array(recordSchema).max(100) })
    .safeParse(JSON.parse(body));
  if (!parsed.success) return json({ error: "invalid_records" }, 400);
  for (const r of parsed.data.records) {
    const day = workouts.find((w) => w.day === r.day)!;
    if (
      (r.exercise !== "__session" &&
        (!day.exercises.some((e) => e.id === r.exercise) ||
          r.set_number < 1)) ||
      (r.exercise === "__session" && r.set_number !== 0)
    )
      return json({ error: "invalid_exercise" }, 400);
  }
  const accepted: RecordData[] = [],
    conflicts: RecordData[] = [];
  for (const r of parsed.data.records) {
    const result = await env.DB.prepare(
      `INSERT INTO records (user_id,id,session_id,date,exercise,set_number,load,reps,rir,completed,note,duration,day,created_at,updated_at,deleted_at,version)
   SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1 WHERE ? = 0 OR EXISTS (SELECT 1 FROM records WHERE user_id = ? AND id = ?)
   ON CONFLICT(user_id,id) DO UPDATE SET session_id=excluded.session_id,date=excluded.date,exercise=excluded.exercise,set_number=excluded.set_number,load=excluded.load,reps=excluded.reps,rir=excluded.rir,completed=excluded.completed,note=excluded.note,duration=excluded.duration,day=excluded.day,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,version=records.version+1
   WHERE records.version = ? RETURNING *`,
    )
      .bind(
        user,
        r.id,
        r.session_id,
        r.date,
        r.exercise,
        r.set_number,
        r.load,
        r.reps,
        r.rir,
        Number(r.completed),
        r.note,
        r.duration,
        r.day,
        r.created_at,
        new Date().toISOString(),
        r.deleted_at,
        r.version,
        user,
        r.id,
        r.version,
      )
      .first<Record<string, unknown>>();
    if (result) accepted.push(decode(result));
    else {
      const current = await env.DB.prepare(
        "SELECT * FROM records WHERE user_id = ? AND id = ?",
      )
        .bind(user, r.id)
        .first<Record<string, unknown>>();
      if (current) conflicts.push(decode(current));
      else
        return json({ error: "missing_base_version_export_and_import" }, 409);
    }
  }
  return json({ accepted, conflicts });
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith("/api/"))
      return env.ASSETS.fetch(request);
    let user: string;
    try {
      user = await identity(request, env);
    } catch {
      return json({ error: "authentication_required" }, 401);
    }
    try {
      return await sync(request, env, user);
    } catch (error) {
      if (error instanceof SyntaxError)
        return json({ error: "invalid_json" }, 400);
      return json({ error: "service_unavailable" }, 503);
    }
  },
};
