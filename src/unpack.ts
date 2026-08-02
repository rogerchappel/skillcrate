import { SkillcrateError } from './errors.js';
import { decodeFileContent } from './file-content.js';
import { ensureDir, readText, sha256, validateArchivePaths, writeBytesWithinRoot } from './fs.js';
import { parseManifest } from './pack.js';
import { SkillManifest } from './types.js';

export async function unpackSkill(manifest: SkillManifest, outputDir: string): Promise<void> {
  const paths = validateArchivePaths(manifest.files.map((file) => file.path));
  await ensureDir(outputDir);
  for (const [index, file] of manifest.files.entries()) {
    const rel = paths[index];
    const content = decodeFileContent(file);
    if (content.byteLength !== file.bytes || sha256(content) !== file.sha256) throw new SkillcrateError(`Checksum mismatch for ${rel}`, 'CHECKSUM_MISMATCH');
    await writeBytesWithinRoot(outputDir, rel, content);
  }
}

export async function unpackSkillFromFile(crateFile: string, outputDir: string): Promise<SkillManifest> {
  const manifest = parseManifest(await readText(crateFile));
  await unpackSkill(manifest, outputDir);
  return manifest;
}
