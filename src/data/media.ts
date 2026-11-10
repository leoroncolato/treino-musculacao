import type { Media } from "../types/workout";
import { workouts } from "./workout";
export const media: Record<string, Media> = Object.fromEntries(
  workouts
    .flatMap((w) => w.exercises)
    .map((e) => [
      e.id,
      {
        type: "image",
        alt: `Demonstração de ${e.name} — mídia em revisão`,
        reference:
          "https://www.acefitness.org/resources/everyone/exercise-library/",
      },
    ]),
);
