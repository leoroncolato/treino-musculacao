import { useState } from "react";
import { ImageOff, Play, Pause } from "lucide-react";
import { media } from "../data/media";
export function ExerciseMedia({
  id,
  active,
  onActivate,
}: {
  id: string;
  active: boolean;
  onActivate: () => void;
}) {
  const item = media[id];
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!item?.src || failed)
    return (
      <div className="media-fallback">
        <ImageOff size={23} />
        <div>
          <strong>Demonstração em revisão</strong>
          <p>Peça ao instrutor para conferir o ajuste e a execução.</p>
          <a href={item?.reference} target="_blank" rel="noreferrer">
            Biblioteca de referência ↗
          </a>
        </div>
      </div>
    );
  return (
    <div className="exercise-media">
      <button
        onClick={() => {
          setLoaded(true);
          onActivate();
        }}
      >
        {active ? <Pause size={16} /> : <Play size={16} />}{" "}
        {active ? "Pausar / ocultar" : "Ver demonstração"}
      </button>
      {loaded &&
        (item.type === "video" ? (
          <video
            key={String(active)}
            src={active ? item.src : undefined}
            poster={item.poster}
            muted
            playsInline
            controls
            preload="none"
            autoPlay={
              active && !matchMedia("(prefers-reduced-motion: reduce)").matches
            }
            onError={() => setFailed(true)}
            aria-label={item.alt}
          />
        ) : (
          (item.type === "image" || active) && (
            <img
              src={item.src}
              alt={item.alt}
              loading="lazy"
              onError={() => setFailed(true)}
            />
          )
        ))}
    </div>
  );
}
