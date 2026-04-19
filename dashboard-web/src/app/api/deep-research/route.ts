import { NextRequest, NextResponse } from 'next/server';
import { getCareerOpsMCP } from '@/mcp/client';
import { getCareerOpsPath } from '@/lib/career-ops-path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  return NextResponse.json({
    careerOpsPath,
    available: true,
    message: 'Deep research API ready'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company, role, careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);

    if (!company) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const mcp = getCareerOpsMCP(careerOpsPath);

    try {
      const result = await mcp.deepResearch(company, role);

      let research;
      if (typeof result === 'string') {
        research = parseResearchOutput(result);
      } else if (result.research) {
        research = parseResearchOutput(result.research);
      } else {
        research = result;
      }

      return NextResponse.json({
        success: true,
        company,
        role,
        research
      });
    } catch (error) {
      console.error('MCP deep research error:', error);
      return NextResponse.json({
        error: 'Research failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Failed to conduct deep research',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function parseResearchOutput(output: string): any {
  const sections: Record<string, string> = {};
  let currentSection = '';
  let currentContent: string[] = [];

  const lines = output.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = trimmed.replace(/^#+\s*/, '').replace(/[:*#]/g, '').trim();
      currentContent = [];
    } else if (trimmed) {
      currentContent.push(trimmed);
    }
  }

  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return {
    sections,
    summary: sections['AI Strategy'] || sections['AI Strategy & Products'] || sections['1. AI Strategy & Products'] || '',
    culture: sections['Engineering Culture'] || sections['3. Engineering Culture'] || '',
    challenges: sections['Probable Challenges'] || sections['4. Probable Challenges'] || '',
    competitive: sections['Competitive Landscape'] || sections['5. Competitive Landscape'] || '',
    valueProp: sections['Candidate Value Prop'] || sections['6. Candidate Value Proposition'] || '',
    interviewPrep: sections['Interview Prep'] || sections['Interview Preparation'] || sections['7. Interview Prep'] || '',
    raw: output
  };
}