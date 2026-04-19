import { NextRequest, NextResponse } from 'next/server';
import { getCareerOpsMCP } from '@/mcp/client';
import { getCareerOpsPath } from '@/lib/career-ops-path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  const mcp = getCareerOpsMCP(careerOpsPath);

  try {
    const result = await mcp.patternAnalysis();

    let analysis;
    if (typeof result === 'string') {
      analysis = parseAnalysisOutput(result);
    } else if (result.analysis) {
      analysis = parseAnalysisOutput(result.analysis);
    } else {
      analysis = result;
    }

    return NextResponse.json({
      analysis,
      careerOpsPath
    });
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    return NextResponse.json({
      error: 'Failed to analyze patterns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'analyze', careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);
    const mcp = getCareerOpsMCP(careerOpsPath);

    if (action === 'regenerate') {
      try {
        const result = await mcp.patternAnalysis();
        return NextResponse.json({ success: true, ...result });
      } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Failed to process patterns',
      details: error instanceof Error ? error.message : 'Unknown error'
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
    recommendations: []
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