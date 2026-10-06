// Runs the worker in plain Node with an in-memory SQLite stand-in for D1 (DEMO_MODE, no AI key).
//   node scripts/local-test.mjs [port]     then point the app's AI setup at http://localhost:<port>
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import http from 'node:http';
import worker from '../src/index.js';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const stmt = (sql, params = []) => ({
  bind: (...p) => stmt(sql, p),
  first: async () => sqlite.prepare(sql).get(...params) ?? null,
  all: async () => ({ results: sqlite.prepare(sql).all(...params) }),
  run: async () => sqlite.prepare(sql).run(...params),
});
const DB = { prepare: (sql) => stmt(sql), batch: async (list) => Promise.all(list.map((s) => s.run())) };
const env = { DB, DEMO_MODE: '1', DAILY_LIMIT: '400', ACCESS_CODE: 'test-code-123', ADMIN_TOKEN: 'test-admin-456' };

const port = Number(process.argv[2] || 8787);
http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const r = await worker.fetch(new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers, body }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, () => console.log(`Trinity AI (demo) on http://localhost:${port}`));
