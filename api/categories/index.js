const db = require('../db.cjs');

module.exports = function handler(req, res) {
  if (req.method === 'GET') {
    const categories = db.prepare(`
      SELECT c.id, c.name, c.createdAt,
        COUNT(t.id) AS totalTasks,
        SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) AS doneTasks
      FROM categories c
      LEFT JOIN tasks t ON t.categoryId = c.id
      GROUP BY c.id
      ORDER BY c.createdAt DESC
    `).all();
    return res.status(200).json(categories.map(c => ({ ...c, doneTasks: c.doneTasks || 0 })));
  }

  if (req.method === 'POST') {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name required' });
    const info = db.prepare('INSERT INTO categories (name, createdAt) VALUES (?, ?)').run(name, new Date().toISOString());
    return res.status(200).json({ ok: true, id: info.lastInsertRowid });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
