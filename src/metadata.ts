import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SkillcrateError } from './errors.js';
import { pathExists, readText } from './fs.js';
import { AgentTarget, SkillMetadata } from './types.js';

const targets = new Set<AgentTarget>(['claude-code', 'openai-agents', 'generic']);

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new SkillcrateError(`metadata.${field} must be a non-empty string`, 'INVALID_METADATA');
  return value.trim();
}

function asStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new SkillcrateError(`metadata.${field} must be an array of strings`, 'INVALID_METADATA');
  return value.map((item) => item.trim()).filter(Boolean);
}

export function validateMetadata(raw: unknown): SkillMetadata {
  if (!raw || typeof raw !== 'object') throw new SkillcrateError('metadata must be an object', 'INVALID_METADATA');
  const data = raw as Record<string, unknown>;
  const selectedTargets = asStringArray(data.targets, 'targets') as AgentTarget[] | undefined;
  if (selectedTargets?.some((target) => !targets.has(target))) throw new SkillcrateError('metadata.targets includes an unknown target', 'INVALID_METADATA');
  return {
    name: asString(data.name, 'name'),
    version: asString(data.version, 'version'),
    description: asString(data.description, 'description'),
    author: data.author === undefined ? undefined : asString(data.author, 'author'),
    license: data.license === undefined ? undefined : asString(data.license, 'license'),
    homepage: data.homepage === undefined ? undefined : asString(data.homepage, 'homepage'),
    tags: asStringArray(data.tags, 'tags'),
    targets: selectedTargets,
    entry: data.entry === undefined ? 'SKILL.md' : asString(data.entry, 'entry'),
    attribution: data.attribution === undefined ? undefined : asString(data.attribution, 'attribution'),
    safety: asStringArray(data.safety, 'safety')
  };
}

export async function readMetadata(skillDir: string): Promise<SkillMetadata> {
  const manifest = path.join(skillDir, 'skillcrate.json');
  if (await pathExists(manifest)) {
    return validateMetadata(JSON.parse(await readText(manifest)));
  }
  const packageJson = path.join(skillDir, 'package.json');
  if (await pathExists(packageJson)) {
    const pkg = JSON.parse(await readText(packageJson));
    return validateMetadata({
      name: pkg.name,
      version: pkg.version ?? '0.0.0',
      description: pkg.description,
      author: typeof pkg.author === 'string' ? pkg.author : undefined,
      license: pkg.license,
      tags: pkg.keywords,
      entry: 'SKILL.md'
    });
  }
  const stat = await fs.stat(skillDir).catch(() => undefined);
  if (!stat?.isDirectory()) throw new SkillcrateError(`Skill directory not found: ${skillDir}`, 'NOT_FOUND');
  throw new SkillcrateError('No skillcrate.json or package.json metadata found', 'MISSING_METADATA');
}
