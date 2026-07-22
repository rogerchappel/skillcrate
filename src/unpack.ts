import { SkillcrateError } from './errors.js';
import { ensureDir, readText, sha256, validateArchivePaths, writeTextWithinRoot } from './fs.js';
import { parseManifest } from './pack.js';
import { SkillManifest } from './types.js';

export async function unpackSkill(manifest: SkillManifest, outputDir: string): Promise<void> {
  const paths = validateArchivePaths(manifest.files.map((file) => file.path));
  await ensureDir(outputDir);
  for (const [index, file] of manifest.files.entries()) {
    const rel = paths[index];
    if (sha256(file.content) !== file.sha256) throw new SkillcrateError(`Checksum mismatch for ${rel}`, 'CHECKSUM_MISMATCH');
    await writeTextWithinRoot(outputDir, rel, file.content);
  }
}

export async function unpackSkillFromFile(crateFile: string, outputDir: string): Promise<SkillManifest> {
  const manifest = parseManifest(await readText(crateFile));
  await unpackSkill(manifest, outputDir);
  return manifest;
}
