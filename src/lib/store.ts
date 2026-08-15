// File-backed store. Server-only. Deliberately boring: the MVP's job is to make the
// loop legible, not to be a database.
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { Database } from './types';
import { seedDatabase } from './seed';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'pitchin.json');

let cache: Database | null = null;

function load(): Database {
  if (cache) return cache;
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const seeded = seedDatabase();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2));
    cache = seeded;
    return cache;
  }
  cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Database;
  return cache;
}

/** Read the whole database. Treat the result as read-only. */
export function db(): Database {
  return load();
}

/** Mutate the database and persist. Returns whatever the mutator returns. */
export function write<T>(mutator: (data: Database) => T): T {
  const data = load();
  const result = mutator(data);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  cache = data;
  return result;
}

/** Wipe and reseed. Wired to the demo reset button so a walkthrough is repeatable. */
export function reseed(): Database {
  const seeded = seedDatabase();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2));
  cache = seeded;
  return seeded;
}

export function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

let freshMtimeMs: number | null = null;

export function dbFresh(): Database {
  if (!fs.existsSync(DATA_FILE)) {
    cache = null;
    freshMtimeMs = null;
    return load();
  }
  const mtimeMs = fs.statSync(DATA_FILE).mtimeMs;
  if (freshMtimeMs !== mtimeMs) {
    cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Database;
    freshMtimeMs = mtimeMs;
  }
  return load();
}
