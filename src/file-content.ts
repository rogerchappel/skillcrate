import { SkillcrateError } from './errors.js';
import { SkillFile } from './types.js';

export function decodeFileContent(file: Pick<SkillFile, 'content' | 'encoding'>): Buffer {
  if (file.encoding === undefined) return Buffer.from(file.content, 'utf8');
  if (file.encoding !== 'base64') {
    throw new SkillcrateError(`Unsupported file content encoding: ${String(file.encoding)}`, 'INVALID_MANIFEST');
  }
  if (!isCanonicalBase64(file.content)) {
    throw new SkillcrateError('Manifest file content is not valid base64', 'INVALID_MANIFEST');
  }
  return Buffer.from(file.content, 'base64');
}

function isCanonicalBase64(content: string): boolean {
  if (content.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)) {
    return false;
  }
  return Buffer.from(content, 'base64').toString('base64') === content;
}
