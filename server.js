import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'tasks.db');

fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(dbPath);

initDb();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.id, c.name, c.createdAt,
      COUNT(t.id) AS totalTasks,
      SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) AS doneTasks
    FROM categories c
    LEFT JOIN tasks t ON t.categoryId = c.id
    GROUP BY c.id
    ORDER BY c.createdAt DESC
  `).all();
  res.json(categories.map(c => ({ ...c, doneTasks: c.doneTasks || 0 })));
});

app.post('/api/categories', (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  const stmt = db.prepare('INSERT INTO categories (name, createdAt) VALUES (?, ?)');
  const info = stmt.run(name, new Date().toISOString());
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.put('/api/categories/:id', (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/categories/:id', (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM tasks WHERE categoryId = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.get('/api/tasks', (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, c.name as categoryName
    FROM tasks t
    LEFT JOIN categories c ON c.id = t.categoryId
    ORDER BY t.createdAt DESC
  `).all();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, description = '', categoryId = null } = req.body || {};
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return res.status(400).json({ error: 'Title required' });
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO tasks (title, description, done, categoryId, createdAt, updatedAt)
    VALUES (?, ?, 0, ?, ?, ?)
  `).run(cleanTitle, String(description || '').trim(), categoryId || null, now, now);
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.put('/api/tasks/:id', (req, res) => {
  const { title, description = '', done = false, categoryId = null } = req.body || {};
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return res.status(400).json({ error: 'Title required' });
  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, done = ?, categoryId = ?, updatedAt = ?
    WHERE id = ?
  `).run(cleanTitle, String(description || '').trim(), done ? 1 : 0, categoryId || null, new Date().toISOString(), req.params.id);
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/export/markdown', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY createdAt DESC').all();
  const uncategorized = db.prepare('SELECT * FROM tasks WHERE categoryId IS NULL ORDER BY createdAt DESC').all();
  let md = '# Aufgaben Export\n\n';

  categories.forEach(category => {
    md += `## ${category.name}\n\n`;
    const tasks = db.prepare('SELECT * FROM tasks WHERE categoryId = ? ORDER BY createdAt DESC').all(category.id);
    if (!tasks.length) md += '- [ ] Keine Aufgaben\n';
    tasks.forEach(task => {
      md += `- [${task.done ? 'x' : ' '}] ${task.title}`;
      if (task.description) md += ` — ${task.description}`;
      md += '\n';
    });
    md += '\n';
  });

  if (uncategorized.length) {
    md += '## Ohne Kategorie\n\n';
    uncategorized.forEach(task => {
      md += `- [${task.done ? 'x' : ' '}] ${task.title}`;
      if (task.description) md += ` — ${task.description}`;
      md += '\n';
    });
  }

  res.type('text/markdown').send(md);
});

app.post('/api/import/markdown', (req, res) => {
  const markdown = String(req.body?.markdown || '');
  if (!markdown.trim()) return res.status(400).json({ error: 'Markdown required' });

  let currentCategoryId = null;
  const createCategory = db.prepare('INSERT INTO categories (name, createdAt) VALUES (?, ?)');
  const createTask = db.prepare(`INSERT INTO tasks (title, description, done, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`);
  const now = new Date().toISOString();

  markdown.split(/\r?\n/).forEach(line => {
    const heading = line.match(/^##\s+(.+)/);
    if (heading) {
      const name = heading[1].trim();
      if (name.toLowerCase() === 'ohne kategorie') {
        currentCategoryId = null;
      } else {
        const info = createCategory.run(name, now);
        currentCategoryId = info.lastInsertRowid;
      }
      return;
    }

    const taskMatch = line.match(/^- \[( |x)\] (.+)$/i);
    if (taskMatch) {
      const done = taskMatch[1].toLowerCase() === 'x';
      const body = taskMatch[2];
      const parts = body.split(' — ');
      const title = parts.shift()?.trim() || '';
      const description = parts.join(' — ').trim();
      if (title) createTask.run(title, description, done ? 1 : 0, currentCategoryId, now, now);
    }
  });

  res.json({ ok: true });
});

app.get('/api/summary', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  const done = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE done = 1').get().count;
  const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  res.json({ total, done, open: total - done, categories });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Task manager running on http://localhost:${port}`));

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      done INTEGER NOT NULL DEFAULT 0,
      categoryId INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );
  `);
}
