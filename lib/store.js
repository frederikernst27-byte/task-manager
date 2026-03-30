import { createSqliteStore } from './sqlite-store.js';
import { createPostgresStore } from './postgres-store.js';

let storePromise;

export function getStore() {
  if (!storePromise) {
    storePromise = createStore();
  }
  return storePromise;
}

async function createStore() {
  if (process.env.DATABASE_URL) {
    return createPostgresStore();
  }

  return createSqliteStore();
}
