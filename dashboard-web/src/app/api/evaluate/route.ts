import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { getCareerOpsPath, escapeShellArg } from '@/lib/career-ops-path';

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jdText, jdUrl, company, role, careerOpsPath: inputPath } = body;

    if (!jdText && !jdUrl) {
      return NextResponse.json({ error: 'Either jdText or jdUrl is required' }, { status: 400 });
    }

    const careerOpsPath = getCareerOpsPath(inputPath);

    const prompt = buildEvaluationPrompt(jdText || jdUrl, company, role);

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

    const result = parseEvaluationOutput(output);

    return NextResponse.json({
      success: true,
      ...result,
      careerOpsPath,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Failed to evaluate job description',
      details: error instanceof Error ? error.message : 'Unknown error',
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
    targets: profileData.targets || {},
  });
}

function buildEvaluationPrompt(jdContent: string, company?: string, role?: string): string {
  return `You are evaluating a job posting. Perform a comprehensive A-G evaluation.

${jdContent ? `Job Description:\n${jdContent}` : ''}

Generate a detailed evaluation report with:

## Block A: Role Summary
- **Archetype:** ${company || '[Company]'} ${role ? `- ${role}` : ''}
- **Domain:** [Industry/field]
- **Seniority:** [Level detection]
- **Remote:** [Policy]

## Block B: CV-to-JD Mapping
- **Match Score:** [X/5]
- **Gaps:** [List gaps]

## Block C: Level Assessment
- **Detected Level:** [Based on requirements]

## Block D: Compensation Research
- **Market Range:** [Estimated]

## Block E: Personalization Plan
- **CV Changes:** [What to modify]

## Block F: Interview Prep
- **Key Topics:** [5-7 topics]

## Block G: Legitimacy Assessment
- **Verdict:** [High/Proceed/Suspicious]
- **Red Flags:** [Any concerns]

## Summary
- **TL;DR:** [One-sentence summary]
- **Comp:** [Compensation if mentioned or estimated]
- **Remote:** [Remote policy]
- **Overall Score:** [X/5]
- **Archetype:** [Archetype name]

Format as Markdown.`;
}

function parseEvaluationOutput(output: string) {
  const scoreMatch = output.match(/\*\*(?:Overall )?Score:\*\*\s*(\d+\.?\d*)/i) || output.match(/Score:\s*(\d+\.?\d*)\/5/i);
  const archetypeMatch = output.match(/\*\*(?:Arquetipo|Archetype):\*\*\s*([^\n|]+)/i);
  const tldrMatch = output.match(/\*\*TL;DR:\*\*\s*([^\n]+)/i);
  const compMatch = output.match(/\*\*Comp:\*\*\s*([^\n]+)/i);
  const remoteMatch = output.match(/\*\*Remote:\*\*\s*([^\n]+)/i);
  const verdictMatch = output.match(/\*\*Verdict:\*\*\s*([^\n]+)/i);

  const blocks: Record<string, string> = {};
  const blockRegex = /##\s+(Block\s+[A-G]:.+?)(?=\n##\s+Block|\n##\s+Summary|$)/gi;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(output)) !== null) {
    const title = blockMatch[1].trim().replace(/^Block\s+[A-G]:\s*/, '');
    blocks[title] = blockMatch[0].replace(/^##\s+Block\s+[A-G]:\s*.+\n/, '').trim();
  }

  return {
    report: output,
    evaluation: {
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
      archetype: archetypeMatch ? archetypeMatch[1].trim() : '',
      tldr: tldrMatch ? tldrMatch[1].trim() : '',
      comp: compMatch ? compMatch[1].trim() : '',
      remote: remoteMatch ? remoteMatch[1].trim() : '',
      verdict: verdictMatch ? verdictMatch[1].trim() : '',
      blocks,
    },
  };
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
