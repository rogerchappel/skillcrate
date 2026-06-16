#!/usr/bin/env node
import { checkCompatibility } from './compat.js';
import { readMetadata } from './metadata.js';
import { packSkillToFile } from './pack.js';
import { writeRegistry } from './registry.js';
import { unpackSkillFromFile } from './unpack.js';
import { verifyCrateFile } from './verify.js';
import { AgentTarget } from './types.js';

function usage(): string {
  return `skillcrate — local-first skill bundle toolkit\n\nUsage:\n  skillcrate inspect <skill-dir>\n  skillcrate pack <skill-dir> <out.skillcrate.json>\n  skillcrate verify <crate-file>\n  skillcrate unpack <crate-file> <out-dir>\n  skillcrate index <registry-root> <out.json>\n  skillcrate check <skill-dir> [--target claude-code|openai-agents|generic]\n`;
}

function arg(args: string[], name: string, fallback?: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

async function main(args: string[]): Promise<void> {
  const [command, first, second] = args;
  if (!command || command === '--help' || command === '-h') { console.log(usage()); return; }
  if (command === 'inspect' && first) { console.log(JSON.stringify(await readMetadata(first), null, 2)); return; }
  if (command === 'pack' && first && second) { const manifest = await packSkillToFile(first, second); console.log(`Packed ${manifest.metadata.name} (${manifest.files.length} files) -> ${second}`); return; }
  if (command === 'verify' && first) { const result = await verifyCrateFile(first); console.log(JSON.stringify({ ok: result.ok, fileCount: result.fileCount, bytes: result.bytes, digestMismatches: result.digestMismatches, name: result.manifest.metadata.name }, null, 2)); if (!result.ok) process.exitCode = 1; return; }
  if (command === 'unpack' && first && second) { const manifest = await unpackSkillFromFile(first, second); console.log(`Unpacked ${manifest.metadata.name} -> ${second}`); return; }
  if (command === 'index' && first && second) { const registry = await writeRegistry(first, second); console.log(`Indexed ${registry.entries.length} skills -> ${second}`); return; }
  if (command === 'check' && first) { const target = (arg(args, '--target', 'generic') ?? 'generic') as AgentTarget; const report = await checkCompatibility(first, target); console.log(JSON.stringify(report, null, 2)); if (!report.ok) process.exitCode = 1; return; }
  console.error(usage()); process.exitCode = 1;
}

main(process.argv.slice(2)).catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
