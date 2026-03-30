const db = require('../db.cjs');

module.exports = function handler(req, res) {
  const id = req.query.id;

  if (req.method === 'PUT') {
    const { title, description = '', done = false, categoryId = null } = req.body || {};
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) return res.status(400).json({ error: 'Title required' });
    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, done = ?, categoryId = ?, updatedAt = ?
      WHERE id = ?
    `).run(cleanTitle, String(description || '').trim(), done ? 1 : 0, categoryId || null, new Date().toISOString(), id);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
