import { z } from "zod";
import { recordSchema } from "./records";
import { useEffect, useRef, useState } from "react";
import { readRecords, writeRecords } from "./storage";
import {
  mergeRemote,
  toWire,
  type LocalRecord,
  type RecordData,
} from "./records";
export function useRecords() {
  const [initial] = useState(() => {
    try {
      return { data: readRecords(), error: "" };
    } catch {
      return {
        data: [] as LocalRecord[],
        error:
          "Não foi possível ler os dados locais. Não grave novos dados antes de recuperar seu backup.",
      };
    }
  });
  const [records, setRecords] = useState(initial.data);
  const ref = useRef(records);
  const [error, setError] = useState(initial.error);
  const [status, setStatus] = useState("Somente neste dispositivo");
  const [connected, setConnected] = useState(false);
  const [last, setLast] = useState(() => {
    try {
      return localStorage.getItem("bella:last-sync") ?? "";
    } catch {
      return "";
    }
  });
  const busy = useRef(false);
  function save(next: LocalRecord[]) {
    if (initial.error) throw new Error(initial.error);
    try {
      writeRecords(next);
      ref.current = next;
      setRecords(next);
      setError("");
    } catch {
      setError(
        "Não foi possível salvar. Armazenamento cheio ou indisponível: exporte seus dados e libere espaço.",
      );
      throw new Error("storage");
    }
  }
  function update(fn: (r: LocalRecord[]) => LocalRecord[]) {
    try {
      save(fn(ref.current));
    } catch {
      /* Visible error; never claim a successful save. */
    }
  }
  async function synchronize() {
    if (busy.current) return;
    busy.current = true;
    setStatus("Sincronizando…");
    try {
      const request = async (url: string, init?: RequestInit) => {
        const response = await fetch(url, {
          ...init,
          redirect: "manual",
          credentials: "same-origin",
        });
        if (
          response.status === 401 ||
          response.status === 403 ||
          response.type === "opaqueredirect" ||
          response.status === 302
        )
          throw new Error("login");
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("application/json")
        )
          throw new Error("service");
        return response.json();
      };
      // Authenticate before sending any private local data.
      let cursor = "";
      do {
        const page: { records: RecordData[]; next: string | null } = z
          .object({
            records: z.array(recordSchema),
            next: z.string().nullable(),
          })
          .parse(
            await request(
              `/api/sync/records?cursor=${encodeURIComponent(cursor)}`,
            ),
          );
        setConnected(true);
        save(
          page.records.reduce((list, r) => {
            const old = list.find((v) => v.id === r.id);
            return [...list.filter((v) => v.id !== r.id), mergeRemote(old, r)];
          }, ref.current),
        );
        cursor = page.next ?? "";
      } while (cursor);
      const pending = ref.current.filter((r) => r.dirty && !r.conflict);
      for (let i = 0; i < pending.length; i += 100) {
        const batch = pending.slice(i, i + 100);
        const result: { accepted: RecordData[]; conflicts: RecordData[] } = z
          .object({
            accepted: z.array(recordSchema),
            conflicts: z.array(recordSchema),
          })
          .parse(
            await request("/api/sync/records", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ records: batch.map(toWire) }),
            }),
          );
        save(
          ref.current.map((local) => {
            const conflict = result.conflicts.find((r) => r.id === local.id);
            if (conflict) return { ...local, conflict };
            const accepted = result.accepted.find((r) => r.id === local.id);
            if (!accepted) return local;
            const sent = batch.find((r) => r.id === local.id)!;
            return JSON.stringify(toWire(local)) ===
              JSON.stringify(toWire(sent))
              ? { ...accepted, dirty: false }
              : { ...local, version: accepted.version, dirty: true };
          }),
        );
      }
      const now = new Date().toISOString();
      localStorage.setItem("bella:last-sync", now);
      setLast(now);
      setStatus(
        ref.current.some((r) => r.conflict)
          ? "Conflitos precisam de revisão"
          : ref.current.some((r) => r.dirty)
            ? "Alterações pendentes"
            : "Tudo sincronizado",
      );
    } catch (e) {
      if (e instanceof Error && e.message === "login") {
        setConnected(false);
        setStatus("Entre para sincronizar");
      } else
        setStatus(
          "Sem sincronização. Dados locais preservados; tente novamente.",
        );
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    if (new URLSearchParams(location.search).get("connected") === "1") {
      history.replaceState(null, "", location.pathname);
      void synchronize();
    }
  }, []);
  useEffect(() => {
    const online = () => {
      if (connected) void synchronize();
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [connected]);
  return { records, update, error, status, connected, last, synchronize };
}
