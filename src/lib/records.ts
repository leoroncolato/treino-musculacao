import { z } from "zod";
const iso = z.string().datetime();
export const recordSchema = z
  .object({
    id: z.string().uuid(),
    session_id: z.string().uuid(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !Number.isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v,
      ),
    day: z.number().int().min(2).max(6),
    exercise: z.string().min(1).max(60),
    set_number: z.number().int().min(0).max(10),
    load: z.number().min(0).max(2000).nullable(),
    reps: z.number().int().min(0).max(500).nullable(),
    rir: z.number().int().min(0).max(10).nullable(),
    completed: z.boolean(),
    note: z.string().max(2000),
    duration: z.number().int().min(0).max(86400),
    created_at: iso,
    updated_at: iso,
    deleted_at: iso.nullable(),
    version: z.number().int().nonnegative(),
  })
  .strict();
export type RecordData = z.infer<typeof recordSchema>;
export type LocalRecord = RecordData & {
  dirty: boolean;
  conflict?: RecordData;
  conflictOrigin?: "import";
};
export function mergeRemote(
  local: LocalRecord | undefined,
  remote: RecordData,
): LocalRecord {
  if (!local || !local.dirty) return { ...remote, dirty: false };
  if (local.version === remote.version) return local;
  return { ...local, conflict: remote };
}
export function resolveConflict(
  local: LocalRecord,
  choice: "local" | "remote",
): LocalRecord {
  if (!local.conflict) return local;
  if (choice === "remote")
    return local.conflictOrigin === "import"
      ? {
          ...local.conflict,
          version: local.version,
          dirty: true,
          updated_at: new Date().toISOString(),
        }
      : { ...local.conflict, dirty: false };
  const { conflict, conflictOrigin, ...record } = local;
  return {
    ...record,
    version: conflictOrigin === "import" ? local.version : conflict.version,
    updated_at: new Date().toISOString(),
    dirty: true,
  };
}
export const toWire = (r: LocalRecord): RecordData =>
  recordSchema.parse(
    Object.fromEntries(
      Object.keys(recordSchema.shape).map((k) => [k, r[k as keyof RecordData]]),
    ),
  );
export function importBackup(
  text: string,
  existing: LocalRecord[],
): LocalRecord[] {
  const parsed = z
    .object({
      format: z.literal("treino-bella-v1"),
      records: z.array(recordSchema).max(10000),
      conflicts: z.array(recordSchema).max(10000).optional(),
    })
    .parse(JSON.parse(text));
  const map = new Map(existing.map((r) => [r.id, r]));
  for (const r of parsed.records) {
    const prev = map.get(r.id);
    if (prev) {
      if (JSON.stringify(toWire(prev)) !== JSON.stringify(r))
        map.set(r.id, { ...prev, conflict: r, conflictOrigin: "import" });
    } else map.set(r.id, { ...r, version: 0, dirty: true });
  }
  for (const r of parsed.conflicts ?? []) {
    const prev = map.get(r.id);
    if (prev) map.set(r.id, { ...prev, conflict: r, conflictOrigin: "import" });
  }
  return [...map.values()];
}
