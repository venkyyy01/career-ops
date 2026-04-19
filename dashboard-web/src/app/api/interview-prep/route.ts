import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { getCareerOpsPath, escapeShellArg } from '@/lib/career-ops-path';

const execFileAsync = promisify(execFile);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));
  const company = searchParams.get('company');

  if (company) {
    const prepPath = path.join(careerOpsPath, 'interview-prep', `${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`);

    try {
      const content = await fs.readFile(prepPath, 'utf-8');
      return NextResponse.json({ content, company });
    } catch {
      return NextResponse.json({ content: null, company, error: 'Prep file not found' });
    }
  }

  const prepDir = path.join(careerOpsPath, 'interview-prep');
  let prepFiles: any[] = [];

  try {
    const files = await fs.readdir(prepDir);
    const statPromises = files
      .filter(f => f.endsWith('.md'))
      .map(async f => {
        const filePath = path.join(prepDir, f);
        const stat = await fs.stat(filePath);
        return {
          name: f.replace('.md', ''),
          path: filePath,
          modified: stat.mtime
        };
      });
    prepFiles = (await Promise.all(statPromises))
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());
  } catch { /* No prep dir */ }

  const storyBankPath = path.join(prepDir, 'story-bank.md');
  let storyBank: any = { stories: [] };

  try {
    const content = await fs.readFile(storyBankPath, 'utf-8');
    storyBank = parseStoryBank(content);
  } catch { /* No story bank */ }

  return NextResponse.json({
    prepFiles,
    storyBank,
    careerOpsPath
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company, role, jdText, careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);

    if (!company) {
      return NextResponse.json({ error: 'Company is required' }, { status: 400 });
    }

    const prepDir = path.join(careerOpsPath, 'interview-prep');
    await fs.mkdir(prepDir, { recursive: true });

    const prompt = buildInterviewPrepPrompt(company, role, jdText);

    let output = '';
    try {
      const { stdout } = await execFileAsync('claude', [
        '-p',
        '--output-format', 'stream-json',
        prompt.slice(0, 80000)
      ], {
        cwd: careerOpsPath,
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      });
      output = stdout;
    } catch (error: any) {
      output = error.stdout || error.message;
    }

    const companySlug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = role
      ? `${companySlug}-${role.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`
      : `${companySlug}.md`;

    const prepPath = path.join(prepDir, fileName);
    await fs.writeFile(prepPath, output, 'utf-8');

    return NextResponse.json({
      success: true,
      fileName,
      path: prepPath,
      content: output
    });
  } catch (error) {
    console.error('Interview prep error:', error);
    return NextResponse.json({
      error: 'Failed to generate interview prep',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function buildInterviewPrepPrompt(company: string, role?: string, jdText?: string): string {
  let prompt = `Generate interview preparation material for ${company}`;

  if (role) {
    prompt += ` for the ${role} position`;
  }

  prompt += `.

Research and include:
1. **Interview Process** - Typical rounds, duration, format
2. **Round-by-Round Breakdown** - What to expect in each stage
3. **Likely Questions** - Both technical and behavioral
4. **Company-Specific Signals** - Values, culture, vocabulary
5. **Questions to Ask** - Insightful questions that impress
6. **Red Flags** - Warning signs to watch for`;

  if (jdText) {
    prompt += `\n\nBased on this job description:\n${jdText.slice(0, 5000)}`;
  }

  prompt += `\n\nFormat as comprehensive Markdown.`;

  return prompt;
}

function parseStoryBank(content: string): any {
  const lines = content.split('\n');
  const stories: any[] = [];
  let currentStory: any = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      if (currentStory && currentStory.title) {
        stories.push(currentStory);
      }
      currentStory = { title: trimmed.replace(/^#+\s*/, ''), content: [] };
    } else if (currentStory && trimmed) {
      currentStory.content.push(trimmed);
    }
  }

  if (currentStory && currentStory.title) {
    stories.push(currentStory);
  }

  return { stories };
}
