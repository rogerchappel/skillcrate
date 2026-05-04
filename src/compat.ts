import path from 'node:path';
import { pathExists } from './fs.js';
import { readMetadata } from './metadata.js';
import { AgentTarget, CompatibilityIssue, CompatibilityReport } from './types.js';

export async function checkCompatibility(skillDir: string, target: AgentTarget): Promise<CompatibilityReport> {
  const metadata = await readMetadata(skillDir);
  const issues: CompatibilityIssue[] = [];
  const entry = metadata.entry ?? 'SKILL.md';
  if (!(await pathExists(path.join(skillDir, entry)))) issues.push({ level: 'error', code: 'missing-entry', message: `Entry file ${entry} does not exist.` });
  if (metadata.targets && !metadata.targets.includes(target) && !metadata.targets.includes('generic')) issues.push({ level: 'warning', code: 'target-not-declared', message: `${target} is not declared in metadata.targets.` });
  if (!metadata.attribution) issues.push({ level: 'warning', code: 'missing-attribution', message: 'Add attribution so downstream users can preserve inspiration and authorship.' });
  if (!metadata.safety?.length) issues.push({ level: 'warning', code: 'missing-safety', message: 'Add safety notes for boundaries, network behavior, and secrets handling.' });
  if (target === 'claude-code' && entry !== 'SKILL.md') issues.push({ level: 'warning', code: 'claude-entry', message: 'Claude Code style skill folders are easiest to review with SKILL.md as the entry.' });
  return { target, ok: !issues.some((issue) => issue.level === 'error'), issues };
}
