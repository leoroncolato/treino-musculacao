export interface Exercise {
  id: string;
  name: string;
  primary: string;
  secondary: string[];
  sets: number;
  reps: string;
  rest: number;
  rir: string;
  instruction: string;
  errors: string;
  alternative: string;
  safety: string;
}
export interface Workout {
  day: number;
  label: string;
  title: string;
  focus: string;
  exercises: Exercise[];
}
export interface Media {
  src?: string;
  poster?: string;
  alt: string;
  type: "image" | "video" | "animated" | "embed";
  reference: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
  note?: string;
  frames?: string[];
  provider?: "youtube" | "vimeo";
  videoId?: string;
}
