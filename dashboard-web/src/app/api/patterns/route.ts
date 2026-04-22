import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { getCareerOpsPath } from '@/lib/career-ops-path';

const execFileAsync = promisify(execFile);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  try {
    const { stdout } = await execFileAsync('node', [
      path.join(careerOpsPath, 'analyze-patterns.mjs'),
    ], {
      cwd: careerOpsPath,
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const analysis = parseAnalysisOutput(stdout);

    return NextResponse.json({
      analysis,
      careerOpsPath,
    });
  } catch (error: any) {
    const output = error.stdout || '';
    const analysis = output ? parseAnalysisOutput(output) : null;

    return NextResponse.json({
      analysis,
      error: error.message,
      careerOpsPath,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'analyze', careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);

    if (action === 'regenerate') {
      try {
        const { stdout } = await execFileAsync('node', [
          path.join(careerOpsPath, 'analyze-patterns.mjs'),
        ], {
          cwd: careerOpsPath,
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024,
        });

        const analysis = parseAnalysisOutput(stdout);
        return NextResponse.json({ success: true, analysis });
      } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Failed to process patterns',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

function parseAnalysisOutput(output: string): any {
  const lines = output.split('\n');
  const analysis: any = {
    summary: '',
    funnelAnalysis: {},
    archetypePerformance: [],
    topBlockers: [],
    recommendations: [],
  };

  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const title = trimmed.toLowerCase().replace(/^#+\s*/, '').trim();
      if (title.includes('summary')) currentSection = 'summary';
      else if (title.includes('funnel') || title.includes('conversion')) currentSection = 'funnel';
      else if (title.includes('archetype')) currentSection = 'archetype';
      else if (title.includes('blocker')) currentSection = 'blocker';
      else if (title.includes('recommend')) currentSection = 'recommendation';
    } else if (trimmed.startsWith('|') && currentSection) {
      const fields = trimmed.split('|').map(f => f.trim()).filter(f => f);
      if (fields[0] === '#' || fields[0] === '---') continue;
      if (currentSection === 'archetype') {
        analysis.archetypePerformance.push(fields.join(' | '));
      } else if (currentSection === 'blocker') {
        analysis.topBlockers.push(fields.join(' | '));
      } else if (currentSection === 'recommendation') {
        analysis.recommendations.push(fields.join(' | '));
      }
    } else if (trimmed.length > 0 && currentSection === 'summary' && !trimmed.startsWith('#')) {
      analysis.summary += (analysis.summary ? ' ' : '') + trimmed;
    }
  }

  return analysis;
}
