import db from '../db.js';

export default function handler(req, res) {
  const total = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  const done = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE done = 1').get().count;
  const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  res.status(200).json({ total, done, open: total - done, categories });
}
