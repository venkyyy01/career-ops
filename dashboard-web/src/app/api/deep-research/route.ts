import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getCareerOpsPath } from '@/lib/career-ops-path';

const execFileAsync = promisify(execFile);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  return NextResponse.json({
    careerOpsPath,
    available: true,
    message: 'Deep research API ready',
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

    const prompt = `# Deep Company Research: ${company}

Research and provide comprehensive intel on:

## 1. AI Strategy & Products
What AI/ML products? Tech stack? Engineering blog topics?

## 2. Recent Movements
Recent hires, acquisitions, funding, pivots, leadership changes?

## 3. Engineering Culture
Deploy cadence? Mono or multi-repo? Remote policy? Tech stack?

## 4. Probable Challenges
Scaling challenges? Reliability issues? Technical debt?

## 5. Competitive Landscape
Main competitors? Differentiation?

## 6. Candidate Value Prop
Why work here? Projects you'd work on?

## 7. Interview Prep
Likely technical topics? Behavioral themes? Questions to ask?

Format as detailed Markdown.`;

    let output = '';
    try {
      const { stdout } = await execFileAsync('claude', [
        '-p',
        '--output-format', 'stream-json',
        prompt.slice(0, 100000),
      ], {
        cwd: careerOpsPath,
        timeout: 180000,
        maxBuffer: 10 * 1024 * 1024,
      });
      output = stdout;
    } catch (error: any) {
      output = error.stdout || error.message;
    }

    const research = parseResearchOutput(output);

    return NextResponse.json({
      success: true,
      company,
      role,
      research,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Failed to conduct deep research',
      details: error instanceof Error ? error.message : 'Unknown error',
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
  };
}
