import { useEffect, useState } from "react";
import { Timer, Play, Pause, RotateCcw, Plus } from "lucide-react";
export function RestTimer({
  preset,
}: {
  preset: { seconds: number; key: number };
}) {
  const [seconds, setSeconds] = useState(preset.seconds);
  const [end, setEnd] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      if (end !== null) {
        const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        setSeconds(left);
        if (!left) setEnd(null);
      }
    }, 200);
    return () => clearInterval(id);
  }, [end]);
  function reset() {
    setEnd(null);
    setSeconds(preset.seconds);
  }
  // Parent remounts only when a new exercise rest is explicitly selected.
  return (
    <aside
      className={`timer ${seconds === 0 ? "finished" : ""}`}
      aria-label="Cronômetro de descanso"
    >
      <div>
        <Timer size={20} />
        <span>DESCANSO</span>
      </div>
      <strong role="timer">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:
        {String(seconds % 60).padStart(2, "0")}
      </strong>
      <button
        aria-label={end ? "Pausar descanso" : "Iniciar descanso"}
        onClick={() => setEnd(end ? null : Date.now() + seconds * 1000)}
      >
        {end ? <Pause /> : <Play />}
      </button>
      <button aria-label="Reiniciar descanso" onClick={reset}>
        <RotateCcw />
      </button>
      <button
        aria-label="Adicionar 15 segundos"
        onClick={() => {
          setSeconds((s) => s + 15);
          if (end) setEnd(end + 15000);
        }}
      >
        <Plus size={15} />
        15s
      </button>
      {seconds === 0 && <span role="status">Próxima série!</span>}
    </aside>
  );
}
