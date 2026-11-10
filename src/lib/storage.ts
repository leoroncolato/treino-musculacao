import { app } from "../config/app";
import { recordSchema, type LocalRecord } from "./records";
export function readRecords(): LocalRecord[] {
  const raw = localStorage.getItem(app.storageKey);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data))
    throw new Error(
      "Backup local inválido. Exporte o armazenamento antes de continuar.",
    );
  return data.map((r) => ({
    ...recordSchema.parse(
      Object.fromEntries(Object.keys(recordSchema.shape).map((k) => [k, r[k]])),
    ),
    dirty: r.dirty === true,
    ...(r.conflict
      ? {
          conflict: recordSchema.parse(r.conflict),
          ...(r.conflictOrigin === "import"
            ? { conflictOrigin: "import" as const }
            : {}),
        }
      : {}),
  }));
}
export function writeRecords(records: LocalRecord[]) {
  localStorage.setItem(app.storageKey, JSON.stringify(records));
}
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
