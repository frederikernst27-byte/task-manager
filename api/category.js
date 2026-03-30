import db from './db.js';

export default function handler(req, res) {
  const id = req.query.id;

  if (req.method === 'PUT') {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name required' });
    db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM tasks WHERE categoryId = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
