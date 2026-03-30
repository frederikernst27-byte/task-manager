import db from './db.js';

export default function handler(req, res) {
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

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.status(200).send(md);
}
