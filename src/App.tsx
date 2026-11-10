import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Cloud,
  Download,
  Dumbbell,
  History,
  LockKeyhole,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import { workouts, progression, volumes } from "./data/workout";
import { localDate } from "./lib/storage";
import { useRecords } from "./lib/useRecords";
import {
  importBackup,
  resolveConflict,
  toWire,
  type LocalRecord,
} from "./lib/records";
import { ExerciseMedia } from "./components/Media";
import { RestTimer } from "./components/Timer";
const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
function makeRecord(
  day: number,
  session: string,
  exercise: string,
  set: number,
): LocalRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    session_id: session,
    date: localDate(),
    day,
    exercise,
    set_number: set,
    load: null,
    reps: null,
    rir: null,
    completed: false,
    note: "",
    duration: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    version: 0,
    dirty: true,
  };
}
export default function App() {
  const store = useRecords();
  const reduced = useReducedMotion();
  const [day, setDay] = useState(new Date().getDay());
  const [tab, setTab] = useState<"workout" | "history" | "plan">("workout");
  const [week, setWeek] = useState(1);
  const [activeMedia, setActiveMedia] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState({ seconds: 90, key: 0 });
  const workout = workouts.find((w) => w.day === day);
  const session = store.records.find(
    (r) => r.id === sessionId && !r.deleted_at,
  );
  const current = store.records.filter(
    (r) =>
      r.session_id === sessionId && !r.deleted_at && r.exercise !== "__session",
  );
  const complete = current.filter((r) => r.completed).length;
  const total = current.length;
  const sessions = store.records
    .filter((r) => r.exercise === "__session" && !r.deleted_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const conflicts = store.records.filter((r) => r.conflict);
  function patch(id: string, fields: Partial<LocalRecord>) {
    store.update((list) =>
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              ...fields,
              dirty: true,
              updated_at: new Date().toISOString(),
            }
          : r,
      ),
    );
  }
  function start() {
    if (!workout) return;
    const id = crypto.randomUUID(),
      root = makeRecord(day, id, "__session", 0);
    root.id = id;
    store.update((list) => [
      ...list,
      root,
      ...workout.exercises.flatMap((e) =>
        Array.from({ length: week <= 2 ? 2 : e.sets }, (_, i) =>
          makeRecord(day, id, e.id, i + 1),
        ),
      ),
    ]);
    setSessionId(id);
  }
  function remove(id: string) {
    if (!confirm("Excluir esta sessão? A exclusão também será sincronizada."))
      return;
    store.update((list) =>
      list.map((r) =>
        r.session_id === id
          ? {
              ...r,
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              dirty: true,
            }
          : r,
      ),
    );
    if (sessionId === id) setSessionId(null);
  }
  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: "treino-bella-v1",
            records: store.records.map(toWire),
            conflicts: store.records.flatMap((r) =>
              r.conflict ? [r.conflict] : [],
            ),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treino-bella-${localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  function selectDay(value: number) {
    setDay(value);
    setSessionId(null);
    setActiveMedia("");
    setTab("workout");
  }
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Treino Bella início">
          <span className="brand-mark">
            <Dumbbell size={24} />
          </span>{" "}
          TREINO <b>BELLA</b>
        </a>
        <span className="header-note">CONSISTÊNCIA CONSTRÓI FORÇA</span>
        <button
          className="icon-button"
          aria-label="Abrir histórico"
          onClick={() => setTab("history")}
        >
          <History size={20} />
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="eyebrow">
            <span /> SEU PROJETO. SEU RITMO.
          </div>
          <h1>
            Mais forte.
            <br />
            <em>A cada treino.</em>
          </h1>
          <p>
            Uma semana bem construída.
            <br className="mobile-only" /> O próximo passo é seu.
          </p>
          <div className="hero-meta">
            <span>
              <b>05</b> treinos / semana
            </span>
            <span>
              <b>08</b> semanas de evolução
            </span>
            <span>
              <b>50–70</b> min / sessão
            </span>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span>01</span>
            <div />
            <Dumbbell size={140} strokeWidth={1} />
            <small>FORÇA É UM HÁBITO.</small>
          </div>
        </section>
        <div className="section-top">
          <div>
            <span className="eyebrow muted">PLANO DE HIPERTROFIA</span>
            <h2>
              Sua semana, em movimento<span>.</span>
            </h2>
          </div>
          <label className="week-select">
            Ciclo{" "}
            <select
              aria-label="Semana do ciclo"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {Array.from({ length: 8 }, (_, i) => (
                <option key={i} value={i + 1}>
                  Semana {String(i + 1).padStart(2, "0")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <nav className="days" aria-label="Dias da semana">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              onClick={() => selectDay(d)}
              className={d === day ? "selected" : ""}
              aria-pressed={d === day}
            >
              <span>
                {days[d]} {d === new Date().getDay() && <i />}
              </span>
              <strong>
                {workouts.find((w) => w.day === d)?.title ?? "Descanso"}
              </strong>
              <small>
                {[0, 1].includes(d) ? "RECUPERAR" : "TREINAR"}
                {d === day && <ArrowUpRight size={16} />}
              </small>
            </button>
          ))}
        </nav>
        <div className="workspace-tabs" role="tablist" aria-label="Seções">
          {(["workout", "history", "plan"] as const).map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              {t === "workout"
                ? "Ficha de treino"
                : t === "history"
                  ? "Meu histórico"
                  : "Plano & evolução"}
            </button>
          ))}
        </div>
        {store.error && (
          <div role="alert" className="notice danger">
            {store.error}
          </div>
        )}
        {message && (
          <div role="status" className="notice">
            {message}
            <button aria-label="Fechar mensagem" onClick={() => setMessage("")}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className="layout">
          <section className="main-column">
            {tab === "workout" &&
              (workout ? (
                <>
                  <div className="workout-heading">
                    <div>
                      <div className="eyebrow muted">
                        {workout.label.toUpperCase()} /{" "}
                        {week <= 2
                          ? "ADAPTAÇÃO · 3 RIR"
                          : "PROGRESSÃO · 1–3 RIR"}
                      </div>
                      <h2>{workout.title}</h2>
                      <p>{workout.focus}</p>
                    </div>
                    <span className="session-count">
                      {String(workout.exercises.length).padStart(2, "0")}
                      <small>EXERCÍCIOS</small>
                    </span>
                  </div>
                  <div className="warmup">
                    <span>ANTES DE COMEÇAR</span>
                    <p>
                      5–8 min de bicicleta leve + 1–2 séries leves dos primeiros
                      movimentos. Aquecimento não conta como série válida.
                      Reserve tempo para os ajustes; não precisa preencher 70
                      minutos.
                    </p>
                  </div>
                  {!session ? (
                    <button
                      className="primary start"
                      onClick={start}
                      disabled={!!store.error}
                    >
                      <PlayIcon /> Iniciar sessão <ArrowUpRight size={18} />
                    </button>
                  ) : (
                    <div className="session-progress">
                      <div>
                        <strong>
                          {session.completed
                            ? "Sessão finalizada"
                            : "Sessão em andamento"}
                        </strong>
                        <span>
                          {complete}/{total} séries
                        </span>
                      </div>
                      <progress max={total || 1} value={complete} />
                      <label>
                        Data do treino{" "}
                        <input
                          aria-label="Data do treino"
                          type="date"
                          value={session.date}
                          onChange={(e) => {
                            if (e.target.value)
                              store.update((list) =>
                                list.map((r) =>
                                  r.session_id === session.id
                                    ? {
                                        ...r,
                                        date: e.target.value,
                                        dirty: true,
                                        updated_at: new Date().toISOString(),
                                      }
                                    : r,
                                ),
                              );
                          }}
                        />
                      </label>
                    </div>
                  )}
                  {workout.exercises.map((e, index) => (
                    <motion.article
                      key={`${day}-${e.id}`}
                      className="exercise-card"
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="exercise-top">
                        <span className="exercise-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <small>{e.primary}</small>
                          <h3>{e.name}</h3>
                        </div>
                        {current.filter((r) => r.exercise === e.id).length >
                          0 &&
                          current
                            .filter((r) => r.exercise === e.id)
                            .every((r) => r.completed) && (
                            <Check className="green" />
                          )}
                      </div>
                      <div className="prescription">
                        <div>
                          <b>{week <= 2 ? 2 : e.sets}</b>
                          <span>SÉRIES</span>
                        </div>
                        <div>
                          <b>{e.reps}</b>
                          <span>REPETIÇÕES</span>
                        </div>
                        <div>
                          <b>{week <= 2 ? "3" : "1–3"}</b>
                          <span>RIR</span>
                        </div>
                        <button
                          onClick={() =>
                            setTimer({ seconds: e.rest, key: Date.now() })
                          }
                        >
                          <b>{e.rest}s</b>
                          <span>DESCANSO ↗</span>
                        </button>
                      </div>
                      <details>
                        <summary>
                          Execução, alternativa e demonstração{" "}
                          <ChevronDown size={16} />
                        </summary>
                        <div className="instructions">
                          <p>{e.instruction}</p>
                          <p>
                            <b>Evite:</b> {e.errors}
                          </p>
                          <p>
                            <b>Alternativa:</b> {e.alternative}
                          </p>
                          <p>
                            <b>Segurança:</b> {e.safety}
                          </p>
                          <p>
                            <b>Auxiliares:</b>{" "}
                            {e.secondary.join(", ") || "Movimento isolado"}.
                          </p>
                          <ExerciseMedia
                            id={e.id}
                            active={activeMedia === e.id}
                            onActivate={() =>
                              setActiveMedia(activeMedia === e.id ? "" : e.id)
                            }
                          />
                        </div>
                      </details>
                      {session && (
                        <div className="set-editor">
                          <label className="exercise-complete">
                            <input
                              type="checkbox"
                              aria-label={`Concluir exercício ${e.name}`}
                              checked={current
                                .filter((r) => r.exercise === e.id)
                                .every((r) => r.completed)}
                              onChange={(ev) =>
                                store.update((list) =>
                                  list.map((r) =>
                                    r.session_id === session.id &&
                                    r.exercise === e.id &&
                                    !r.deleted_at
                                      ? {
                                          ...r,
                                          completed: ev.target.checked,
                                          dirty: true,
                                          updated_at: new Date().toISOString(),
                                        }
                                      : r,
                                  ),
                                )
                              }
                            />{" "}
                            Exercício concluído
                          </label>
                          <div className="set-labels">
                            <span>Série</span>
                            <span>kg</span>
                            <span>Reps</span>
                            <span>RIR</span>
                            <span>Feito</span>
                          </div>
                          {current
                            .filter((r) => r.exercise === e.id)
                            .sort((a, b) => a.set_number - b.set_number)
                            .map((r) => (
                              <div className="set-row" key={r.id}>
                                <span>{r.set_number}</span>
                                {(["load", "reps", "rir"] as const).map(
                                  (field) => (
                                    <input
                                      key={field}
                                      aria-label={`${e.name} série ${r.set_number} ${field === "load" ? "carga" : field === "reps" ? "repetições" : "RIR"}`}
                                      type="number"
                                      inputMode="decimal"
                                      min={0}
                                      max={
                                        field === "load"
                                          ? 2000
                                          : field === "reps"
                                            ? 500
                                            : 10
                                      }
                                      step={field === "load" ? 0.5 : 1}
                                      value={r[field] ?? ""}
                                      onChange={(ev) => {
                                        const value =
                                          ev.target.value === ""
                                            ? null
                                            : Number(ev.target.value);
                                        if (
                                          value === null ||
                                          (value >= 0 &&
                                            value <=
                                              (field === "load"
                                                ? 2000
                                                : field === "reps"
                                                  ? 500
                                                  : 10) &&
                                            (field === "load" ||
                                              Number.isInteger(value)))
                                        )
                                          patch(r.id, { [field]: value });
                                      }}
                                    />
                                  ),
                                )}
                                <input
                                  aria-label={`Concluir ${e.name} série ${r.set_number}`}
                                  type="checkbox"
                                  checked={r.completed}
                                  onChange={(ev) =>
                                    patch(r.id, {
                                      completed: ev.target.checked,
                                    })
                                  }
                                />
                              </div>
                            ))}
                          <label>
                            Observações do exercício
                            <textarea
                              maxLength={2000}
                              placeholder="Ajustes, técnica, como se sentiu…"
                              value={
                                current.find((r) => r.exercise === e.id)
                                  ?.note ?? ""
                              }
                              onChange={(ev) => {
                                const record = current.find(
                                  (r) => r.exercise === e.id,
                                );
                                if (record)
                                  patch(record.id, { note: ev.target.value });
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </motion.article>
                  ))}
                  {session && (
                    <div className="finish-panel">
                      <label>
                        Duração (min)
                        <input
                          aria-label="Duração em minutos"
                          type="number"
                          min={0}
                          max={1440}
                          value={Math.round(session.duration / 60)}
                          onChange={(e) =>
                            patch(session.id, {
                              duration: Math.min(
                                86400,
                                Math.max(
                                  0,
                                  Math.round(Number(e.target.value) * 60),
                                ),
                              ),
                            })
                          }
                        />
                      </label>
                      <button
                        className="primary"
                        onClick={() => {
                          patch(session.id, {
                            completed: !session.completed,
                            duration:
                              session.duration ||
                              Math.min(
                                86400,
                                Math.round(
                                  (Date.now() -
                                    Date.parse(session.created_at)) /
                                    1000,
                                ),
                              ),
                          });
                          setMessage(
                            session.completed
                              ? "Sessão reaberta."
                              : "Sessão salva neste dispositivo.",
                          );
                        }}
                      >
                        {session.completed
                          ? "Reabrir sessão"
                          : "Finalizar sessão"}
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Limpar cargas, repetições e observações desta sessão?",
                            )
                          )
                            store.update((list) =>
                              list.map((r) =>
                                r.session_id === session.id
                                  ? {
                                      ...r,
                                      load: null,
                                      reps: null,
                                      rir: null,
                                      note: "",
                                      completed: false,
                                      duration: 0,
                                      dirty: true,
                                      updated_at: new Date().toISOString(),
                                    }
                                  : r,
                              ),
                            );
                        }}
                      >
                        Limpar sessão
                      </button>
                      <button
                        className="danger-text"
                        onClick={() => remove(session.id)}
                      >
                        Excluir sessão
                      </button>
                    </div>
                  )}
                  <div className="warmup">
                    <span>SEM PRESSA. SEM FALHA OBRIGATÓRIA.</span>
                    <p>
                      RIR = repetições que ainda conseguiria fazer com boa
                      técnica. Evite falha nos compostos; nos isoladores,
                      aproxime-se apenas com execução segura. Séries unilaterais
                      são por lado.
                    </p>
                  </div>
                </>
              ) : (
                <div className="rest-day">
                  <Dumbbell size={44} />
                  <div className="eyebrow">RECUPERAR TAMBÉM É TREINAR</div>
                  <h2>
                    Hoje, dê espaço
                    <br />
                    para evoluir.
                  </h2>
                  <p>
                    Segunda e domingo são dias de descanso. Priorize sono,
                    alimentação e uma caminhada leve, se desejar.
                  </p>
                  <button className="primary" onClick={() => selectDay(2)}>
                    Ver treino de terça <ArrowUpRight size={18} />
                  </button>
                </div>
              ))}
            {tab === "history" && (
              <>
                <h2>Meu histórico</h2>
                <p className="muted">
                  Registros privados deste dispositivo e da sua sincronização.
                </p>
                <div className="backup-actions">
                  <button onClick={exportData}>
                    <Download size={16} /> Exportar JSON
                  </button>
                  <label className="button">
                    <Upload size={16} /> Importar backup
                    <input
                      aria-label="Importar backup"
                      hidden
                      type="file"
                      accept="application/json,.json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10000000) {
                          setMessage("Arquivo grande demais. Limite: 10 MB.");
                          return;
                        }
                        try {
                          const next = importBackup(
                            await file.text(),
                            store.records,
                          );
                          store.update(() => next);
                          setMessage(
                            "Backup lido. Divergências ficam na revisão de conflitos.",
                          );
                        } catch {
                          setMessage(
                            "Backup inválido. Nenhum registro foi importado.",
                          );
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {!sessions.length && (
                  <div className="empty-state">
                    Seu próximo treino começa a sua história.
                    <p>
                      Inicie uma sessão pela ficha para registrar as séries.
                    </p>
                  </div>
                )}
                {sessions.map((s) => (
                  <article className="history-card" key={s.id}>
                    <span>{s.date.split("-").reverse().join("/")}</span>
                    <h3>{workouts.find((w) => w.day === s.day)?.title}</h3>
                    <p>
                      {s.completed ? "Finalizada" : "Em andamento"} ·{" "}
                      {Math.round(s.duration / 60)} min ·{" "}
                      {
                        store.records.filter(
                          (r) =>
                            r.session_id === s.id &&
                            r.exercise !== "__session" &&
                            r.completed &&
                            !r.deleted_at,
                        ).length
                      }{" "}
                      séries concluídas
                    </p>
                    <button
                      onClick={() => {
                        setDay(s.day);
                        setSessionId(s.id);
                        setTab("workout");
                      }}
                    >
                      Ver / editar registros
                    </button>
                    <button
                      className="danger-text"
                      onClick={() => remove(s.id)}
                    >
                      Excluir
                    </button>
                  </article>
                ))}
              </>
            )}
            {tab === "plan" && (
              <>
                <h2>Oito semanas de consistência</h2>
                <p>Comece com margem. A carga é consequência da técnica.</p>
                {progression.map((p) => (
                  <article className="plan-card" key={p.weeks}>
                    <span>SEMANAS {p.weeks}</span>
                    <h3>{p.title}</h3>
                    <p>{p.text}</p>
                  </article>
                ))}
                <h3>Volume semanal aproximado</h3>
                <p className="muted">
                  Séries válidas nas semanas 3–8. Compostos contribuem para
                  vários músculos; não some como séries isoladas equivalentes.
                  Nas semanas 1–2, são 2 séries por exercício.
                </p>
                <div className="volume-grid">
                  {volumes.map(([g, v]) => (
                    <div key={g}>
                      <span>{g}</span>
                      <b>{v}</b>
                    </div>
                  ))}
                </div>
                <p>
                  Nos superiores, reserve 45–55 min para musculação. Cardio é
                  opcional: 10–20 min de bicicleta ou escada leve/moderada,
                  preferencialmente depois dos superiores. Encurte ou omita para
                  não ultrapassar 70 min.
                </p>
              </>
            )}
          </section>
          <aside className="sidebar">
            <div className="coach-card">
              <div className="eyebrow">O FOCO AGORA</div>
              <h3>
                {week <= 2
                  ? "Técnica primeiro."
                  : week <= 6
                    ? "Uma repetição a mais."
                    : "Consolidar a evolução."}
              </h3>
              <p>{progression[week <= 2 ? 0 : week <= 6 ? 1 : 2].text}</p>
              <span className="pill">
                SEMANA {String(week).padStart(2, "0")} / 08
              </span>
            </div>
            <div className="sync-card">
              <div className="card-title">
                <Cloud size={21} />
                <h3>Seu treino acompanha você.</h3>
              </div>
              <p>Registre aqui. Continue em outro dispositivo após entrar.</p>
              <div role="status" className="sync-status">
                {store.connected ? <Check size={15} /> : <WifiOff size={15} />}{" "}
                {store.connected ? "Sincronização conectada" : "Registro local"}
              </div>
              <small>{store.status}</small>
              {store.last && (
                <small>
                  Última sincronização:{" "}
                  {new Date(store.last).toLocaleString("pt-BR")}
                </small>
              )}
              <button className="outline" onClick={store.synchronize}>
                Sincronizar
              </button>
              {!store.connected && (
                <a className="login-link" href="/api/sync/login">
                  Entrar com código por e-mail ↗
                </a>
              )}
              {store.connected && (
                <a href="/cdn-cgi/access/logout">Encerrar sessão</a>
              )}
              <small>
                {store.records.filter((r) => r.dirty).length} registros
                pendentes
              </small>
            </div>
            <div className="privacy">
              <LockKeyhole size={18} />
              <p>
                A ficha é pública. Seu histórico é privado: visitantes não podem
                consultá-lo. Os dados locais permanecem neste dispositivo até a
                sincronização, que exige autenticação. Em aparelho
                compartilhado, exporte e remova os dados do navegador ao sair.
              </p>
            </div>
            <div className="cardio">
              <span>+ MOVIMENTO</span>
              <h3>Cardio, no seu ritmo.</h3>
              <p>
                Bicicleta ou escada · 10–20 min
                <br />
                Leve a moderado, após superiores.
                <br />
                Respeite o limite de 70 min.
              </p>
            </div>
          </aside>
        </div>
        {conflicts.length > 0 && (
          <section
            className="conflicts"
            aria-label="Conflitos de sincronização"
          >
            <h2>Revisar {conflicts.length} divergência(s)</h2>
            <p>
              As duas versões estão preservadas. Exporte um backup antes de
              escolher. A versão escolhida poderá ser sincronizada novamente.
            </p>
            {conflicts.map((r) => (
              <div key={r.id}>
                <h3>
                  {r.date} · {r.exercise} · série {r.set_number}
                </h3>
                <p>
                  Local: {r.load ?? "—"} kg / {r.reps ?? "—"} reps / RIR{" "}
                  {r.rir ?? "—"} · {r.deleted_at ? "excluído" : "ativo"} ·{" "}
                  {r.note}
                </p>
                <p>
                  Outra versão: {r.conflict!.load ?? "—"} kg /{" "}
                  {r.conflict!.reps ?? "—"} reps / RIR {r.conflict!.rir ?? "—"}{" "}
                  · {r.conflict!.deleted_at ? "excluído" : "ativo"} ·{" "}
                  {r.conflict!.note}
                </p>
                <button
                  onClick={() =>
                    store.update((list) =>
                      list.map((v) =>
                        v.id === r.id ? resolveConflict(v, "local") : v,
                      ),
                    )
                  }
                >
                  Manter local
                </button>
                <button
                  onClick={() =>
                    store.update((list) =>
                      list.map((v) =>
                        v.id === r.id ? resolveConflict(v, "remote") : v,
                      ),
                    )
                  }
                >
                  Usar outra versão
                </button>
              </div>
            ))}
          </section>
        )}
        <footer>
          <b>TREINO BELLA</b>
          <p>
            Esta ficha não substitui avaliação presencial. Interrompa movimentos
            que causem dor e procure orientação profissional.
          </p>
          <span>UM TREINO DE CADA VEZ.</span>
        </footer>
      </main>
      <RestTimer key={timer.key} preset={timer} />
    </>
  );
}
function PlayIcon() {
  return <span aria-hidden="true">▶</span>;
}
