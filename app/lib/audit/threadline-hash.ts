import crypto from 'crypto';

interface VersionHashInput {
  threadlineId: string;
  filePath: string;
  patterns: string[];
  content: string;
  version: string;
  repoName: string | null;
  account: string;
}

interface IdentityHashInput {
  threadlineId: string;
  filePath: string;
  repoName: string | null;
  account: string;
}

/**
 * Generate a version-specific hash for a threadline definition.
 * This hash uniquely identifies an exact version of a threadline.
 * Same hash = exact same definition, can be reused.
 */
export function generateVersionHash(input: VersionHashInput): string {
  const data = JSON.stringify({
    threadlineId: input.threadlineId,
    filePath: input.filePath,
    patterns: input.patterns, // Not sorted - order from file is deterministic
    content: input.content,
    version: input.version,
    repoName: input.repoName || '',
    account: input.account,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate an identity hash for a threadline.
 * This hash identifies the threadline across versions.
 * Same identity_hash + different version_hash = new version of same threadline.
 */
export function generateIdentityHash(input: IdentityHashInput): string {
  const data = JSON.stringify({
    threadlineId: input.threadlineId,
    filePath: input.filePath,
    repoName: input.repoName || '',
    account: input.account,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

