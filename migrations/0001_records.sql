CREATE TABLE IF NOT EXISTS records (
 user_id TEXT NOT NULL,
 id TEXT NOT NULL,
 session_id TEXT NOT NULL,
 date TEXT NOT NULL,
 exercise TEXT NOT NULL,
 set_number INTEGER NOT NULL CHECK(set_number BETWEEN 0 AND 10),
 load REAL, reps INTEGER, rir INTEGER,
 completed INTEGER NOT NULL CHECK(completed IN (0,1)),
 note TEXT NOT NULL DEFAULT '',
 duration INTEGER NOT NULL DEFAULT 0,
 day INTEGER NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 deleted_at TEXT,
 version INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(user_id, id)
);
CREATE INDEX IF NOT EXISTS records_user_date ON records(user_id,date);
CREATE INDEX IF NOT EXISTS records_user_session ON records(user_id,session_id);
