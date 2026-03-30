import db from '../db.js';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const tasks = db.prepare(`
      SELECT t.*, c.name as categoryName
      FROM tasks t
      LEFT JOIN categories c ON c.id = t.categoryId
      ORDER BY t.createdAt DESC
    `).all();
    return res.status(200).json(tasks);
  }

  if (req.method === 'POST') {
    const { title, description = '', categoryId = null } = req.body || {};
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) return res.status(400).json({ error: 'Title required' });
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO tasks (title, description, done, categoryId, createdAt, updatedAt)
      VALUES (?, ?, 0, ?, ?, ?)
    `).run(cleanTitle, String(description || '').trim(), categoryId || null, now, now);
    return res.status(200).json({ ok: true, id: info.lastInsertRowid });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
