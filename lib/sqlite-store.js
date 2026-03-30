import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const dbPath = path.join(dataDir, 'tasks.db');

export async function createSqliteStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);

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

  return {
    kind: 'sqlite',
    async listCategories() {
      const rows = db.prepare(`
        SELECT c.id, c.name, c.createdAt,
          COUNT(t.id) AS totalTasks,
          SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) AS doneTasks
        FROM categories c
        LEFT JOIN tasks t ON t.categoryId = c.id
        GROUP BY c.id
        ORDER BY c.createdAt DESC
      `).all();
      return rows.map(row => ({ ...row, doneTasks: row.doneTasks || 0 }));
    },
    async createCategory(name) {
      const info = db.prepare('INSERT INTO categories (name, createdAt) VALUES (?, ?)').run(name, new Date().toISOString());
      return Number(info.lastInsertRowid);
    },
    async updateCategory(id, name) {
      db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id);
    },
    async deleteCategory(id) {
      db.prepare('DELETE FROM tasks WHERE categoryId = ?').run(id);
      db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    },
    async listTasks() {
      return db.prepare(`
        SELECT t.*, c.name AS categoryName
        FROM tasks t
        LEFT JOIN categories c ON c.id = t.categoryId
        ORDER BY t.createdAt DESC
      `).all();
    },
    async createTask({ title, description = '', categoryId = null }) {
      const now = new Date().toISOString();
      const info = db.prepare(`
        INSERT INTO tasks (title, description, done, categoryId, createdAt, updatedAt)
        VALUES (?, ?, 0, ?, ?, ?)
      `).run(title, description, categoryId, now, now);
      return Number(info.lastInsertRowid);
    },
    async updateTask(id, { title, description = '', done = false, categoryId = null }) {
      db.prepare(`
        UPDATE tasks
        SET title = ?, description = ?, done = ?, categoryId = ?, updatedAt = ?
        WHERE id = ?
      `).run(title, description, done ? 1 : 0, categoryId, new Date().toISOString(), id);
    },
    async deleteTask(id) {
      db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    },
    async exportMarkdown() {
      const categories = db.prepare('SELECT * FROM categories ORDER BY createdAt DESC').all();
      const uncategorized = db.prepare('SELECT * FROM tasks WHERE categoryId IS NULL ORDER BY createdAt DESC').all();
      return buildMarkdown(categories, uncategorized, categoryId => db.prepare('SELECT * FROM tasks WHERE categoryId = ? ORDER BY createdAt DESC').all(categoryId));
    },
    async importMarkdown(markdown) {
      const createCategory = db.prepare('INSERT INTO categories (name, createdAt) VALUES (?, ?)');
      const createTask = db.prepare('INSERT INTO tasks (title, description, done, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
      const now = new Date().toISOString();
      let currentCategoryId = null;

      markdown.split(/\r?\n/).forEach(line => {
        const heading = line.match(/^##\s+(.+)/);
        if (heading) {
          const name = heading[1].trim();
          if (name.toLowerCase() === 'ohne kategorie') {
            currentCategoryId = null;
          } else {
            const info = createCategory.run(name, now);
            currentCategoryId = Number(info.lastInsertRowid);
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
          if (title) {
            createTask.run(title, description, done ? 1 : 0, currentCategoryId, now, now);
          }
        }
      });
    },
    async getSummary() {
      const total = db.prepare('SELECT COUNT(*) AS count FROM tasks').get().count;
      const done = db.prepare('SELECT COUNT(*) AS count FROM tasks WHERE done = 1').get().count;
      const categories = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
      return { total, done, open: total - done, categories };
    }
  };
}

function buildMarkdown(categories, uncategorized, getTasksForCategory) {
  let md = '# Aufgaben Export\n\n';

  categories.forEach(category => {
    md += `## ${category.name}\n\n`;
    const tasks = getTasksForCategory(category.id);
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

  return md;
}
