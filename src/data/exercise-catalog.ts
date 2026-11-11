import { workouts } from "./workout";
import { legacyWorkouts } from "./workout-legacy";
import type { Exercise } from "../types/workout";

export function isKnownExercise(day: number, id: string): boolean {
  return [...workouts, ...legacyWorkouts].some(
    (w) => w.day === day && w.exercises.some((e) => e.id === id),
  );
}

// A published session keeps its recorded movements and number of sets.
// The catalog includes both plans; no historic IDs or records are rewritten.
export function exercisesForSession(
  day: number,
  records: { exercise: string }[],
): Exercise[] {
  const ids = new Set(records.map((r) => r.exercise));
  const current = workouts.find((w) => w.day === day)?.exercises ?? [];
  const legacy = legacyWorkouts.find((w) => w.day === day)?.exercises ?? [];
  const oldPlan = legacy.some(
    (e) => ids.has(e.id) && !current.some((n) => n.id === e.id),
  );
  const catalog = oldPlan ? [...legacy, ...current] : [...current, ...legacy];
  const seen = new Set<string>();
  return catalog
    .filter((e) => {
      if (!ids.has(e.id) || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .map((e) => ({
      ...e,
      sets: records.filter((r) => r.exercise === e.id).length,
    }));
}
