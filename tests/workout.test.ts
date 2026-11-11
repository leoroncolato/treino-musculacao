import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { workouts } from "../src/data/workout";
import { legacyWorkouts } from "../src/data/workout-legacy";
import {
  exercisesForSession,
  isKnownExercise,
} from "../src/data/exercise-catalog";
import { media } from "../src/data/media";

describe("revised program and published-session compatibility", () => {
  it("preserves five days, requested movements, 5–7 exercises and the set increase", () => {
    expect(workouts.map((w) => w.day)).toEqual([2, 3, 4, 5, 6]);
    expect(workouts[0].exercises.map((e) => e.id)).toEqual([
      "smith",
      "ext",
      "seatedcalf",
      "press",
      "adductor",
    ]);
    expect(workouts[1].exercises.map((e) => e.id)).toEqual([
      "shoulder",
      "pronated",
      "french",
      "seatedlateral",
      "alternating",
      "row",
      "deadbug",
    ]);
    const original = legacyWorkouts.flatMap((w) => w.exercises);
    for (const w of workouts) {
      expect(w.exercises.length).toBeGreaterThanOrEqual(5);
      expect(w.exercises.length).toBeLessThanOrEqual(7);
      expect(new Set(w.exercises.map((e) => e.id)).size).toBe(
        w.exercises.length,
      );
      for (const e of w.exercises) {
        expect([3, 4]).toContain(e.sets);
        const old = original.find((o) => o.id === e.id);
        if (old) expect(e.sets).toBe(old.sets + 1);
      }
    }
    expect(
      workouts.map((w) => w.exercises.reduce((n, e) => n + e.sets, 0)),
    ).toEqual([17, 23, 17, 23, 17]);
  });

  it("opens the former Tuesday with its original names and recorded two sets", () => {
    const oldRecords = ["press", "hack", "ext", "calf"].flatMap((exercise) => [
      { exercise },
      { exercise },
    ]);
    const historic = exercisesForSession(2, oldRecords);
    expect(historic.map((e) => e.id)).toEqual(["press", "hack", "ext", "calf"]);
    expect(historic.find((e) => e.id === "hack")?.name).toBe(
      "Hack squat • opcional",
    );
    expect(historic.every((e) => e.sets === 2)).toBe(true);
    expect(isKnownExercise(2, "hack")).toBe(true);
    expect(isKnownExercise(5, "shoulder")).toBe(true);
    expect(isKnownExercise(3, "shoulder")).toBe(true);
    expect(isKnownExercise(2, "shoulder")).toBe(false);
    expect(isKnownExercise(2, "invented")).toBe(false);
  });

  it("covers every current movement with a licensed local video or public authorized player", () => {
    const evidence = JSON.parse(
      readFileSync("docs/media-evidence.json", "utf8"),
    ) as {
      exercise: string;
      file: string;
      sha256?: string;
      permissions?: { view: string; embed: string };
      oembed?: { domain_status_code: number | null };
    }[];
    const ids = new Set(workouts.flatMap((w) => w.exercises.map((e) => e.id)));
    expect(ids.size).toBe(27);
    for (const id of ids) {
      const m = media[id],
        proof = evidence.find((e) => e.exercise === id)!;
      expect(m, id).toBeDefined();
      expect(m.author && m.license && m.licenseUrl, id).toBeTruthy();
      expect(proof, id).toBeDefined();
      if (m.type === "video") {
        expect(m.src).toMatch(/^\/media\/exercises\/.+\.mp4$/);
        expect(existsSync(`public${m.poster}`)).toBe(true);
        expect(
          createHash("sha256")
            .update(readFileSync(`public${m.src}`))
            .digest("hex"),
        ).toBe(proof.sha256);
      } else {
        expect(m.type).toBe("embed");
        expect(m.provider).toBe("vimeo");
        expect(m.videoId).toMatch(/^\d+$/);
        expect(proof.permissions).toMatchObject({
          view: "anybody",
          embed: "public",
        });
        expect(proof.oembed?.domain_status_code).toBeNull();
      }
    }
  });
});
