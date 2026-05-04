import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SkillcrateError } from './errors.js';

const IGNORED = new Set(['.git', 'node_modules', 'dist', '.DS_Store']);

export async function pathExists(target: string): Promise<boolean> {
  try { await fs.access(target); return true; } catch { return false; }
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function safeRelativePath(input: string): string {
  const normalized = path.posix.normalize(input.replaceAll('\\', '/'));
  if (normalized.startsWith('../') || normalized === '..' || path.isAbsolute(input)) {
    throw new SkillcrateError(`Unsafe archive path: ${input}`, 'UNSAFE_PATH');
  }
  return normalized;
}

export async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (IGNORED.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).replaceAll(path.sep, '/');
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(rel);
    }
  }
  await walk(root);
  return out.sort();
}

export async function readText(file: string): Promise<string> {
  return fs.readFile(file, 'utf8');
}

export async function writeText(file: string, content: string): Promise<void> {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, content, 'utf8');
}
