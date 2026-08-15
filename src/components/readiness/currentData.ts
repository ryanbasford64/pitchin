import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '@/lib/store';
import type { Database } from '@/lib/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'pitchin.json');

export function currentData(): Database {
  if (!fs.existsSync(DATA_FILE)) return db();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Database;
}
