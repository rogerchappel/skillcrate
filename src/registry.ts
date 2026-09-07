import path from 'node:path';
import { packSkill } from './pack.js';
import { RegistryEntry, RegistryIndex } from './types.js';
import { listFiles, pathExists, readText, sha256, writeText } from './fs.js';

export async function buildRegistry(rootDir: string, generatedAt = new Date().toISOString(), excludedFiles: ReadonlySet<string> = new Set()): Promise<RegistryIndex> {
  const entries: RegistryEntry[] = [];
  for (const rel of await listFiles(rootDir)) {
    if (path.basename(rel) !== 'skillcrate.json') continue;
    const skillDir = path.join(rootDir, path.dirname(rel));
    if (!(await pathExists(path.join(skillDir, 'SKILL.md')))) continue;
    const manifest = await packSkill(skillDir, excludedFiles);
    const bytes = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
    entries.push({ ...manifest.metadata, cratePath: path.dirname(rel), fileCount: manifest.files.length, bytes, digest: sha256(JSON.stringify(manifest.files.map(({ path, sha256 }) => ({ path, sha256 })))) });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { schemaVersion: 'skillcrate-registry/v1', generatedAt, entries };
}

export async function writeRegistry(rootDir: string, outputFile: string): Promise<RegistryIndex> {
  const registry = await buildRegistry(rootDir, new Date().toISOString(), new Set([outputFile]));
  if (await pathExists(outputFile)) {
    try {
      const previous = JSON.parse(await readText(outputFile)) as RegistryIndex;
      if (previous.schemaVersion === registry.schemaVersion && JSON.stringify(previous.entries) === JSON.stringify(registry.entries)) {
        registry.generatedAt = previous.generatedAt;
      }
    } catch {
      // Replace malformed or unrelated prior output with a fresh registry.
    }
  }
  await writeText(outputFile, `${JSON.stringify(registry, null, 2)}\n`);
  return registry;
}
