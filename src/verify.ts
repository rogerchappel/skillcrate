import { readText, safeRelativePath, sha256 } from './fs.js';
import { parseManifest } from './pack.js';
import { SkillManifest } from './types.js';

export interface VerifyResult {
  ok: boolean;
  fileCount: number;
  bytes: number;
  digestMismatches: string[];
  manifest: SkillManifest;
}

export async function verifyCrateFile(crateFile: string): Promise<VerifyResult> {
  return verifyCrate(parseManifest(await readText(crateFile)));
}

export function verifyCrate(manifest: SkillManifest): VerifyResult {
  const digestMismatches: string[] = [];
  let bytes = 0;

  for (const file of manifest.files) {
    const rel = safeRelativePath(file.path);
    const actualBytes = Buffer.byteLength(file.content);
    bytes += actualBytes;
    if (file.bytes !== actualBytes || file.sha256 !== sha256(file.content)) {
      digestMismatches.push(rel);
    }
  }

  return {
    ok: digestMismatches.length === 0,
    fileCount: manifest.files.length,
    bytes,
    digestMismatches,
    manifest
  };
}
