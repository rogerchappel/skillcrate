import path from 'node:path';
import { SkillcrateError } from './errors.js';
import { ensureDir, readText, safeRelativePath, sha256, writeText } from './fs.js';
import { parseManifest } from './pack.js';
import { SkillManifest } from './types.js';

export async function unpackSkill(manifest: SkillManifest, outputDir: string): Promise<void> {
  await ensureDir(outputDir);
  for (const file of manifest.files) {
    const rel = safeRelativePath(file.path);
    if (sha256(file.content) !== file.sha256) throw new SkillcrateError(`Checksum mismatch for ${rel}`, 'CHECKSUM_MISMATCH');
    await writeText(path.join(outputDir, rel), file.content);
  }
}

export async function unpackSkillFromFile(crateFile: string, outputDir: string): Promise<SkillManifest> {
  const manifest = parseManifest(await readText(crateFile));
  await unpackSkill(manifest, outputDir);
  return manifest;
}
