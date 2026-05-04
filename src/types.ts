export type AgentTarget = 'claude-code' | 'openai-agents' | 'generic';

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  homepage?: string;
  tags?: string[];
  targets?: AgentTarget[];
  entry?: string;
  attribution?: string;
  safety?: string[];
}

export interface SkillManifest {
  schemaVersion: 'skillcrate/v1';
  metadata: SkillMetadata;
  files: SkillFile[];
}

export interface SkillFile {
  path: string;
  content: string;
  bytes: number;
  sha256: string;
}

export interface RegistryEntry extends SkillMetadata {
  cratePath?: string;
  fileCount: number;
  bytes: number;
  digest: string;
}

export interface RegistryIndex {
  schemaVersion: 'skillcrate-registry/v1';
  generatedAt: string;
  entries: RegistryEntry[];
}

export interface CompatibilityIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export interface CompatibilityReport {
  target: AgentTarget;
  ok: boolean;
  issues: CompatibilityIssue[];
}
