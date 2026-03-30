import postgres from 'postgres';

export async function createPostgresStore() {
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10
  });

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      done BOOLEAN NOT NULL DEFAULT FALSE,
      "categoryId" INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  return {
    kind: 'postgres',
    async listCategories() {
      const rows = await sql`
        SELECT
          c.id,
          c.name,
          c."createdAt",
          COUNT(t.id)::int AS "totalTasks",
          COALESCE(SUM(CASE WHEN t.done THEN 1 ELSE 0 END), 0)::int AS "doneTasks"
        FROM categories c
        LEFT JOIN tasks t ON t."categoryId" = c.id
        GROUP BY c.id
        ORDER BY c."createdAt" DESC
      `;
      return rows.map(normalizeRow);
    },
    async createCategory(name) {
      const [row] = await sql`
        INSERT INTO categories (name)
        VALUES (${name})
        RETURNING id
      `;
      return row.id;
    },
    async updateCategory(id, name) {
      await sql`UPDATE categories SET name = ${name} WHERE id = ${id}`;
    },
    async deleteCategory(id) {
      await sql.begin(async tx => {
        await tx`DELETE FROM tasks WHERE "categoryId" = ${id}`;
        await tx`DELETE FROM categories WHERE id = ${id}`;
      });
    },
    async listTasks() {
      const rows = await sql`
        SELECT
          t.id,
          t.title,
          t.description,
          t.done,
          t."categoryId",
          t."createdAt",
          t."updatedAt",
          c.name AS "categoryName"
        FROM tasks t
        LEFT JOIN categories c ON c.id = t."categoryId"
        ORDER BY t."createdAt" DESC
      `;
      return rows.map(normalizeRow);
    },
    async createTask({ title, description = '', categoryId = null }) {
      const [row] = await sql`
        INSERT INTO tasks (title, description, done, "categoryId", "createdAt", "updatedAt")
        VALUES (${title}, ${description}, FALSE, ${categoryId}, NOW(), NOW())
        RETURNING id
      `;
      return row.id;
    },
    async updateTask(id, { title, description = '', done = false, categoryId = null }) {
      await sql`
        UPDATE tasks
        SET
          title = ${title},
          description = ${description},
          done = ${done},
          "categoryId" = ${categoryId},
          "updatedAt" = NOW()
        WHERE id = ${id}
      `;
    },
    async deleteTask(id) {
      await sql`DELETE FROM tasks WHERE id = ${id}`;
    },
    async exportMarkdown() {
      const categories = (await sql`SELECT id, name, "createdAt" FROM categories ORDER BY "createdAt" DESC`).map(normalizeRow);
      const uncategorized = (await sql`
        SELECT id, title, description, done, "categoryId", "createdAt", "updatedAt"
        FROM tasks
        WHERE "categoryId" IS NULL
        ORDER BY "createdAt" DESC
      `).map(normalizeRow);

      let md = '# Aufgaben Export\n\n';

      for (const category of categories) {
        md += `## ${category.name}\n\n`;
        const tasks = (await sql`
          SELECT id, title, description, done, "categoryId", "createdAt", "updatedAt"
          FROM tasks
          WHERE "categoryId" = ${category.id}
          ORDER BY "createdAt" DESC
        `).map(normalizeRow);
        if (!tasks.length) md += '- [ ] Keine Aufgaben\n';
        for (const task of tasks) {
          md += `- [${task.done ? 'x' : ' '}] ${task.title}`;
          if (task.description) md += ` — ${task.description}`;
          md += '\n';
        }
        md += '\n';
      }

      if (uncategorized.length) {
        md += '## Ohne Kategorie\n\n';
        for (const task of uncategorized) {
          md += `- [${task.done ? 'x' : ' '}] ${task.title}`;
          if (task.description) md += ` — ${task.description}`;
          md += '\n';
        }
      }

      return md;
    },
    async importMarkdown(markdown) {
      const now = new Date().toISOString();
      let currentCategoryId = null;

      for (const line of markdown.split(/\r?\n/)) {
        const heading = line.match(/^##\s+(.+)/);
        if (heading) {
          const name = heading[1].trim();
          if (name.toLowerCase() === 'ohne kategorie') {
            currentCategoryId = null;
          } else {
            const [row] = await sql`
              INSERT INTO categories (name, "createdAt")
              VALUES (${name}, ${now})
              RETURNING id
            `;
            currentCategoryId = row.id;
          }
          continue;
        }

        const taskMatch = line.match(/^- \[( |x)\] (.+)$/i);
        if (taskMatch) {
          const done = taskMatch[1].toLowerCase() === 'x';
          const body = taskMatch[2];
          const parts = body.split(' — ');
          const title = parts.shift()?.trim() || '';
          const description = parts.join(' — ').trim();
          if (title) {
            await sql`
              INSERT INTO tasks (title, description, done, "categoryId", "createdAt", "updatedAt")
              VALUES (${title}, ${description}, ${done}, ${currentCategoryId}, ${now}, ${now})
            `;
          }
        }
      }
    },
    async getSummary() {
      const [{ count: total }] = await sql`SELECT COUNT(*)::int AS count FROM tasks`;
      const [{ count: done }] = await sql`SELECT COUNT(*)::int AS count FROM tasks WHERE done = TRUE`;
      const [{ count: categories }] = await sql`SELECT COUNT(*)::int AS count FROM categories`;
      return { total, done, open: total - done, categories };
    }
  };
}

function normalizeRow(row) {
  const normalized = { ...row };
  for (const key of ['createdAt', 'updatedAt']) {
    if (normalized[key] instanceof Date) {
      normalized[key] = normalized[key].toISOString();
    }
  }
  return normalized;
}
