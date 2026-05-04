export class SkillcrateError extends Error {
  constructor(message: string, readonly code = 'SKILLCRATE_ERROR') {
    super(message);
    this.name = 'SkillcrateError';
  }
}
