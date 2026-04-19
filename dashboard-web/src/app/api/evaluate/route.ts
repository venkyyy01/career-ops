import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCareerOpsMCP } from '@/mcp/client';
import { getCareerOpsPath } from '@/lib/career-ops-path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jdText, jdUrl, company, role, careerOpsPath: inputPath } = body;

    if (!jdText && !jdUrl) {
      return NextResponse.json({ error: 'Either jdText or jdUrl is required' }, { status: 400 });
    }

    const careerOpsPath = getCareerOpsPath(inputPath);
    const mcp = getCareerOpsMCP(careerOpsPath);

    try {
      const result = await mcp.evaluateJob(jdText, jdUrl, company, role);

      return NextResponse.json({
        success: true,
        ...result,
        careerOpsPath
      });
    } catch (error) {
      console.error('MCP evaluation error:', error);
      return NextResponse.json({
        error: 'Evaluation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Failed to evaluate job description',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  const cvPath = path.join(careerOpsPath, 'cv.md');
  let cvContent = '';

  try {
    cvContent = await fs.readFile(cvPath, 'utf-8');
  } catch { /* No CV */ }

  const profilePath = path.join(careerOpsPath, 'config', 'profile.yml');
  let profileData: any = {};

  try {
    const profileContent = await fs.readFile(profilePath, 'utf-8');
    profileData = parseYamlProfile(profileContent);
  } catch { /* No profile */ }

  return NextResponse.json({
    hasCV: cvContent.length > 0,
    hasProfile: Object.keys(profileData).length > 0,
    archetypes: profileData.archetypes || ['Generalist'],
    targets: profileData.targets || {}
  });
}

function parseYamlProfile(content: string): any {
  const result: any = {};
  const lines = content.split('\n');
  let currentKey = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;

    const keyMatch = trimmed.match(/^(\w+):/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      if (trimmed.includes(':') && !trimmed.endsWith(':')) {
        const value = trimmed.split(':')[1].trim();
        if (value) result[currentKey] = value;
      } else {
        result[currentKey] = {};
      }
    } else if (trimmed.startsWith('- ') && currentKey) {
      const listValue = trimmed.slice(2).trim();
      if (Array.isArray(result[currentKey])) {
        result[currentKey].push(listValue);
      } else {
        result[currentKey] = [listValue];
      }
    }
  }

  return result;
}