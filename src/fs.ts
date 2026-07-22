import { createHash } from 'node:crypto';
import { constants, promises as fs } from 'node:fs';
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
  if (normalized === '.' || normalized.startsWith('../') || normalized === '..' || path.isAbsolute(input)) {
    throw new SkillcrateError(`Unsafe archive path: ${input}`, 'UNSAFE_PATH');
  }
  return normalized;
}

export function validateArchivePaths(inputs: string[]): string[] {
  const normalized = inputs.map(safeRelativePath);
  const destinations = new Set<string>();
  for (const destination of normalized) {
    if (destinations.has(destination)) {
      throw new SkillcrateError(`Duplicate archive destination: ${destination}`, 'INVALID_MANIFEST');
    }
    destinations.add(destination);
  }

  for (const destination of normalized) {
    const parts = destination.split('/');
    for (let index = 1; index < parts.length; index += 1) {
      const parent = parts.slice(0, index).join('/');
      if (destinations.has(parent)) {
        throw new SkillcrateError(`Conflicting archive destinations: ${parent} and ${destination}`, 'INVALID_MANIFEST');
      }
    }
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

function isErrno(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

function assertWithinRoot(root: string, target: string): void {
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new SkillcrateError(`Unsafe archive destination: ${target}`, 'UNSAFE_PATH');
  }
}

export async function writeTextWithinRoot(root: string, relativePath: string, content: string): Promise<void> {
  await ensureDir(root);
  const resolvedRoot = await fs.realpath(root);
  const parts = relativePath.split('/');
  const fileName = parts.pop();
  if (!fileName) throw new SkillcrateError(`Unsafe archive path: ${relativePath}`, 'UNSAFE_PATH');

  let parent = resolvedRoot;
  for (const part of parts) {
    const next = path.join(parent, part);
    try {
      const stat = await fs.lstat(next);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new SkillcrateError(`Unsafe archive destination: ${relativePath}`, 'UNSAFE_PATH');
      }
    } catch (error) {
      if (!isErrno(error, 'ENOENT')) throw error;
      try {
        await fs.mkdir(next);
      } catch (mkdirError) {
        if (!isErrno(mkdirError, 'EEXIST')) throw mkdirError;
        const stat = await fs.lstat(next);
        if (stat.isSymbolicLink() || !stat.isDirectory()) {
          throw new SkillcrateError(`Unsafe archive destination: ${relativePath}`, 'UNSAFE_PATH');
        }
      }
    }
    parent = await fs.realpath(next);
    assertWithinRoot(resolvedRoot, parent);
  }

  const destination = path.join(parent, fileName);
  try {
    const stat = await fs.lstat(destination);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new SkillcrateError(`Unsafe archive destination: ${relativePath}`, 'UNSAFE_PATH');
    }
  } catch (error) {
    if (!isErrno(error, 'ENOENT')) throw error;
  }

  let handle;
  try {
    handle = await fs.open(
      destination,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
      0o666
    );
    await handle.writeFile(content, 'utf8');
  } catch (error) {
    if (isErrno(error, 'ELOOP')) {
      throw new SkillcrateError(`Unsafe archive destination: ${relativePath}`, 'UNSAFE_PATH');
    }
    throw error;
  } finally {
    await handle?.close();
  }
}
