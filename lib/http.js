import { getStore } from './store.js';

export async function withStore(handler) {
  const store = await getStore();
  return handler(store);
}

export function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return {};
}

export function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

export function methodNotAllowed(res) {
  return res.status(405).json({ error: 'Method not allowed' });
}

export function normalizeName(value) {
  return String(value || '').trim();
}
