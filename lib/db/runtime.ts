import fs from 'fs';
import path from 'path';

import { DEFAULT_BACKUP_PATH, DEFAULT_DB_PATH } from '@/lib/constants';

export const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), DEFAULT_DB_PATH);
export const BACKUP_PATH = process.env.BACKUP_PATH || path.join(process.cwd(), DEFAULT_BACKUP_PATH);

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDirectoryExists(path.dirname(DB_PATH));
ensureDirectoryExists(BACKUP_PATH);
