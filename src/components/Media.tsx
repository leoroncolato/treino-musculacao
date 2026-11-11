import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ImageOff, Play, Pause, ExternalLink } from "lucide-react";
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
  const [playing, setPlaying] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!active) video.current?.pause();
    else if (loaded && !reduced) void video.current?.play().catch(() => {});
  }, [active, loaded, reduced]);

  const available = item && (item.src || item.videoId);
  const embedded = item?.type === "embed";
  function activate() {
    setLoaded(true);
    if (item.type === "video" && active && video.current) {
      if (video.current.paused) void video.current.play().catch(() => {});
      else video.current.pause();
    } else onActivate();
  }
  return (
    <div className="exercise-media" data-media-id={id}>
      {!available || failed ? (
        <div className="media-fallback" role="status">
          <ImageOff size={23} />
          <div>
            <strong>Demonstração indisponível neste momento</strong>
            <p>Confira a conexão ou abra a referência abaixo.</p>
            {available && (
              <button
                onClick={() => {
                  setFailed(false);
                  setLoaded(false);
                }}
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <button
            className="media-toggle"
            onClick={activate}
            aria-expanded={loaded && active}
          >
            {(item.type === "video" ? playing : active) ? (
              <Pause size={17} />
            ) : (
              <Play size={17} />
            )}
            {item.type === "image"
              ? active
                ? "Fechar demonstração"
                : "Ver posições do movimento"
              : item.type === "video"
                ? playing
                  ? "Pausar vídeo"
                  : "Ver vídeo de execução"
                : active
                  ? "Fechar vídeo"
                  : "Ver vídeo de execução"}
            <span>
              {embedded
                ? "ONLINE"
                : item.type === "image"
                  ? "IMAGENS"
                  : "VÍDEO"}
            </span>
          </button>
          {item.type === "video" ? (
            <video
              ref={video}
              src={loaded ? item.src : undefined}
              poster={item.poster}
              muted
              playsInline
              controls={loaded}
              preload="none"
              loop
              aria-label={item.alt}
              onPlay={() => {
                setPlaying(true);
                if (!active) onActivate();
              }}
              onPause={() => setPlaying(false)}
              onError={() => setFailed(true)}
            />
          ) : embedded ? (
            active &&
            loaded &&
            (online ? (
              <iframe
                src={
                  item.provider === "youtube"
                    ? `https://www.youtube-nocookie.com/embed/${item.videoId}?playsinline=1&mute=1&autoplay=0&rel=0`
                    : `https://player.vimeo.com/video/${item.videoId}?dnt=1&muted=1&autoplay=0`
                }
                title={item.alt}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="fullscreen; picture-in-picture"
                allowFullScreen
                onError={() => setFailed(true)}
              />
            ) : (
              <p className="media-note" role="status">
                Este vídeo precisa de internet. As instruções e seus registros
                continuam disponíveis offline.
              </p>
            ))
          ) : item.type === "animated" ? (
            (active || item.poster) && (
              <img
                src={active ? item.src : item.poster}
                alt={item.alt}
                loading="lazy"
                onError={() => setFailed(true)}
              />
            )
          ) : (
            <div
              className={
                active && item.frames ? "media-frames" : "media-poster"
              }
            >
              {(active && item.frames
                ? item.frames
                : [item.poster || item.src!]
              ).map((src, i) => (
                <figure key={src}>
                  <img
                    src={src}
                    alt={`${item.alt}${item.frames ? ` · posição ${i + 1}` : ""}`}
                    loading="lazy"
                    onError={() => setFailed(true)}
                  />
                  {active && item.frames && (
                    <figcaption>Posição {i + 1}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </>
      )}
      {item?.note && <p className="media-note">{item.note}</p>}
      {embedded && (
        <p className="media-note">
          O vídeo abre após o toque e precisa de internet. O provedor recebe sua
          conexão; seus registros de treino não são enviados.
        </p>
      )}
      <div className="media-credit">
        <span>
          {item?.author}
          {item?.license && (
            <>
              {" "}
              ·{" "}
              <a href={item.licenseUrl} target="_blank" rel="noreferrer">
                {item.license}
              </a>
            </>
          )}
        </span>
        {item?.reference && (
          <a href={item.reference} target="_blank" rel="noreferrer">
            Abrir na fonte <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
