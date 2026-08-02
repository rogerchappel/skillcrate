import path from 'node:path';
import { SkillcrateError } from './errors.js';
import { decodeFileContent } from './file-content.js';
import { listFiles, readBytes, readText, safeRelativePath, sha256, validateArchivePaths, writeText } from './fs.js';
import { readMetadata, validateMetadata } from './metadata.js';
import { SkillFile, SkillManifest } from './types.js';

export async function packSkill(skillDir: string): Promise<SkillManifest> {
  const metadata = await readMetadata(skillDir);
  const files: SkillFile[] = [];
  for (const rel of await listFiles(skillDir)) {
    const content = await readBytes(path.join(skillDir, rel));
    const text = content.toString('utf8');
    const encoded = Buffer.from(text, 'utf8').equals(content)
      ? { content: text }
      : { content: content.toString('base64'), encoding: 'base64' as const };
    files.push({ path: safeRelativePath(rel), ...encoded, bytes: content.byteLength, sha256: sha256(content) });
  }
  if (!files.some((file) => file.path === (metadata.entry ?? 'SKILL.md'))) {
    throw new SkillcrateError(`Entry file not found: ${metadata.entry ?? 'SKILL.md'}`, 'MISSING_ENTRY');
  }
  return { schemaVersion: 'skillcrate/v1', metadata, files };
}

export async function packSkillToFile(skillDir: string, outputFile: string): Promise<SkillManifest> {
  const manifest = await packSkill(skillDir);
  await writeText(outputFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function parseManifest(raw: string): SkillManifest {
  const parsed = JSON.parse(raw) as SkillManifest;
  if (parsed.schemaVersion !== 'skillcrate/v1') throw new SkillcrateError('Unsupported manifest schemaVersion', 'UNSUPPORTED_SCHEMA');
  const metadata = validateMetadata(parsed.metadata);
  if (!Array.isArray(parsed.files)) throw new SkillcrateError('Manifest files must be an array', 'INVALID_MANIFEST');
  const files = parsed.files.map((file) => {
    if (!file || typeof file !== 'object') throw new SkillcrateError('Manifest file entries must be objects', 'INVALID_MANIFEST');
    if (typeof file.path !== 'string') throw new SkillcrateError('Manifest file path must be a string', 'INVALID_MANIFEST');
    if (typeof file.content !== 'string') throw new SkillcrateError('Manifest file content must be a string', 'INVALID_MANIFEST');
    if (file.encoding !== undefined && file.encoding !== 'base64') throw new SkillcrateError(`Unsupported file content encoding: ${String(file.encoding)}`, 'INVALID_MANIFEST');
    if (typeof file.bytes !== 'number' || !Number.isInteger(file.bytes) || file.bytes < 0) throw new SkillcrateError('Manifest file bytes must be a non-negative integer', 'INVALID_MANIFEST');
    if (typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(file.sha256)) throw new SkillcrateError('Manifest file sha256 must be a hex digest', 'INVALID_MANIFEST');
    const parsedFile = { path: file.path, content: file.content, ...(file.encoding === 'base64' ? { encoding: file.encoding } : {}), bytes: file.bytes, sha256: file.sha256 };
    decodeFileContent(parsedFile);
    return parsedFile;
  });
  const paths = validateArchivePaths(files.map((file) => file.path));
  return {
    schemaVersion: 'skillcrate/v1',
    metadata,
    files: files.map((file, index) => ({ ...file, path: paths[index] }))
  };
}
