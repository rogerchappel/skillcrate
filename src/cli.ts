#!/usr/bin/env node
import { checkCompatibility } from './compat.js';
import { readMetadata } from './metadata.js';
import { packSkillToFile } from './pack.js';
import { writeRegistry } from './registry.js';
import { unpackSkillFromFile } from './unpack.js';
import { verifyCrateFile } from './verify.js';
import { AgentTarget } from './types.js';

const targets = new Set<AgentTarget>(['claude-code', 'openai-agents', 'generic']);

type ParsedCommand =
  | { command: 'inspect' | 'verify'; first: string }
  | { command: 'pack' | 'unpack' | 'index'; first: string; second: string }
  | { command: 'check'; first: string; target: AgentTarget };

function usage(): string {
  return `skillcrate — local-first skill bundle toolkit\n\nUsage:\n  skillcrate inspect <skill-dir>\n  skillcrate pack <skill-dir> <out.skillcrate.json>\n  skillcrate verify <crate-file>\n  skillcrate unpack <crate-file> <out-dir>\n  skillcrate index <registry-root> <out.json>\n  skillcrate check <skill-dir> [--target claude-code|openai-agents|generic]\n`;
}

function usageError(message: string): never {
  throw new Error(message);
}

function parseArgs(args: string[]): ParsedCommand | undefined {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return undefined;
  const [command, ...rest] = args;
  if (!command) usageError('missing command');

  const positionalCounts: Record<string, number> = { inspect: 1, pack: 2, verify: 1, unpack: 2, index: 2 };
  if (command in positionalCounts) {
    const expected = positionalCounts[command];
    if (rest.some((value) => value.startsWith('-'))) usageError(`${command}: unknown option ${rest.find((value) => value.startsWith('-'))}`);
    if (rest.length !== expected) usageError(`${command}: expected ${expected} argument${expected === 1 ? '' : 's'}, received ${rest.length}`);
    if (expected === 1) return { command: command as 'inspect' | 'verify', first: rest[0] };
    return { command: command as 'pack' | 'unpack' | 'index', first: rest[0], second: rest[1] };
  }

  if (command === 'check') {
    if (!rest[0] || rest[0].startsWith('-')) usageError('check: expected a skill directory');
    let target: AgentTarget = 'generic';
    if (rest.length > 1) {
      if (rest[1] !== '--target') usageError(`check: unknown option ${rest[1]}`);
      if (!rest[2] || rest[2].startsWith('-')) usageError('check: --target requires a value');
      if (!targets.has(rest[2] as AgentTarget)) usageError(`check: unsupported target ${rest[2]}`);
      target = rest[2] as AgentTarget;
      if (rest.length > 3) usageError(`check: unexpected argument ${rest[3]}`);
    }
    return { command, first: rest[0], target };
  }

  usageError(`unknown command ${command}`);
}

async function main(args: string[]): Promise<void> {
  let parsed: ParsedCommand | undefined;
  try { parsed = parseArgs(args); } catch (error: unknown) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }
  if (!parsed) { console.log(usage()); return; }
  const { command, first } = parsed;
  if (command === 'inspect' && first) { console.log(JSON.stringify(await readMetadata(first), null, 2)); return; }
  if (command === 'pack') { const manifest = await packSkillToFile(first, parsed.second); console.log(`Packed ${manifest.metadata.name} (${manifest.files.length} files) -> ${parsed.second}`); return; }
  if (command === 'verify' && first) { const result = await verifyCrateFile(first); console.log(JSON.stringify({ ok: result.ok, fileCount: result.fileCount, bytes: result.bytes, digestMismatches: result.digestMismatches, name: result.manifest.metadata.name }, null, 2)); if (!result.ok) process.exitCode = 1; return; }
  if (command === 'unpack') { const manifest = await unpackSkillFromFile(first, parsed.second); console.log(`Unpacked ${manifest.metadata.name} -> ${parsed.second}`); return; }
  if (command === 'index') { const registry = await writeRegistry(first, parsed.second); console.log(`Indexed ${registry.entries.length} skills -> ${parsed.second}`); return; }
  if (command === 'check') { const report = await checkCompatibility(first, parsed.target); console.log(JSON.stringify(report, null, 2)); if (!report.ok) process.exitCode = 1; }
}

main(process.argv.slice(2)).catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
