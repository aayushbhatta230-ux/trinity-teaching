-- Question bank columns (run once on an existing database).
ALTER TABLE questions ADD COLUMN grade TEXT;
ALTER TABLE questions ADD COLUMN origin TEXT;
ALTER TABLE questions ADD COLUMN explanation TEXT;
ALTER TABLE questions ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN check_answer TEXT;
CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(subject, verified, grade);
