import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { getCareerOpsPath } from '@/lib/career-ops-path';

const execFileAsync = promisify(execFile);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  try {
    const portalsPath = path.join(careerOpsPath, 'portals.yml');
    let portals: any[] = [];

    try {
      const content = await fs.readFile(portalsPath, 'utf-8');
      portals = parsePortalsYaml(content);
    } catch { /* no portals.yml */ }

    return NextResponse.json({
      portals,
      careerOpsPath,
    });
  } catch (error) {
    console.error('Error scanning portals:', error);
    return NextResponse.json({
      error: 'Failed to scan portals',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode = 'quick', careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);

    try {
      const { stdout } = await execFileAsync('node', [
        path.join(careerOpsPath, 'scan.mjs'),
        mode,
      ], {
        cwd: careerOpsPath,
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return NextResponse.json({
        success: true,
        output: stdout,
        careerOpsPath,
      });
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message,
        output: error.stdout || '',
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Failed to scan portals',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

function parsePortalsYaml(content: string): any[] {
  const portals: any[] = [];
  const lines = content.split('\n');
  let current: any = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const nameMatch = trimmed.match(/^-\s*name:\s*(.+)/);
    if (nameMatch) {
      if (current) portals.push(current);
      current = { name: nameMatch[1].trim() };
      continue;
    }

    if (current && trimmed.includes(':')) {
      const [key, ...rest] = trimmed.split(':');
      const value = rest.join(':').trim();
      if (key.trim() && value) {
        (current as any)[key.trim()] = value;
      }
    }
  }

  if (current) portals.push(current);
  return portals;
}
