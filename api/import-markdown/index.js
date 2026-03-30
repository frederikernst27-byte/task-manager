const db = require('../db.cjs');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const markdown = String(req.body?.markdown || '');
  if (!markdown.trim()) return res.status(400).json({ error: 'Markdown required' });

  let currentCategoryId = null;
  const createCategory = db.prepare('INSERT INTO categories (name, createdAt) VALUES (?, ?)');
  const createTask = db.prepare('INSERT INTO tasks (title, description, done, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
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

  res.status(200).json({ ok: true });
};
