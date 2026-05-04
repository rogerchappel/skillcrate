import path from 'node:path';
import { packSkill } from './pack.js';
import { RegistryEntry, RegistryIndex } from './types.js';
import { listFiles, pathExists, sha256, writeText } from './fs.js';

export async function buildRegistry(rootDir: string, generatedAt = new Date().toISOString()): Promise<RegistryIndex> {
  const entries: RegistryEntry[] = [];
  for (const rel of await listFiles(rootDir)) {
    if (!rel.endsWith('skillcrate.json')) continue;
    const skillDir = path.join(rootDir, path.dirname(rel));
    if (!(await pathExists(path.join(skillDir, 'SKILL.md')))) continue;
    const manifest = await packSkill(skillDir);
    const bytes = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
    entries.push({ ...manifest.metadata, cratePath: path.dirname(rel), fileCount: manifest.files.length, bytes, digest: sha256(JSON.stringify(manifest.files.map(({ path, sha256 }) => ({ path, sha256 })))) });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { schemaVersion: 'skillcrate-registry/v1', generatedAt, entries };
}

export async function writeRegistry(rootDir: string, outputFile: string): Promise<RegistryIndex> {
  const registry = await buildRegistry(rootDir);
  await writeText(outputFile, `${JSON.stringify(registry, null, 2)}\n`);
  return registry;
}
