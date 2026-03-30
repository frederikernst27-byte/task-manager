const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'tasks.db');
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

module.exports = db;
