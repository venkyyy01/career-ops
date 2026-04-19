import path from 'path';

export function getCareerOpsPath(inputPath: string | null): string {
  let careerOpsPath = inputPath || process.cwd();
  if (careerOpsPath.includes('dashboard-web')) {
    careerOpsPath = careerOpsPath.replace('/dashboard-web', '');
  }
  return careerOpsPath;
}

export function safePath(basePath: string, userPath: string): string | null {
  const resolved = path.resolve(basePath, userPath);
  const resolvedBase = path.resolve(basePath);
  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    return null;
  }
  return resolved;
}

export function escapeShellArg(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}
