-- Past-paper question bank (CEE/MECEE, IOE, IOM) and daily usage counter.

CREATE TABLE IF NOT EXISTS papers (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  exam      TEXT NOT NULL,              -- 'CEE' | 'IOE' | 'IOM'
  year      TEXT,                       -- as printed on the paper, e.g. '2079' (BS) or '2023'
  source    TEXT,                       -- original file name
  added_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id      INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  exam          TEXT NOT NULL,
  year          TEXT,
  qno           TEXT,                   -- question number on the paper
  subject       TEXT NOT NULL,          -- app subject id: physics | chemistry | mathematics | biology | english
  portion       TEXT,                   -- app portion id, e.g. 'phy.electricity' (NULL if unclear)
  topic         TEXT,                   -- short topic, e.g. "Lenz's law"
  question      TEXT NOT NULL,
  options       TEXT NOT NULL,          -- JSON array of 4 strings (A–D)
  answer        TEXT,                   -- 'A'..'D' or NULL when unknown
  answer_source TEXT NOT NULL,          -- 'key' (official answer key) | 'ai' (worked out by AI) | 'none'
  difficulty    INTEGER                 -- 1 (easy) .. 5 (very hard)
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject, portion);
CREATE INDEX IF NOT EXISTS idx_questions_paper ON questions(paper_id);

CREATE TABLE IF NOT EXISTS usage (
  day   TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
