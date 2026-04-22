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
    const { stdout } = await execFileAsync('node', [
      path.join(careerOpsPath, 'followup-cadence.mjs'),
    ], {
      cwd: careerOpsPath,
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const cadence = parseCadenceOutput(stdout);
    const followUps = await loadFollowUps(careerOpsPath);

    return NextResponse.json({
      cadence,
      followUps,
      careerOpsPath,
    });
  } catch (error: any) {
    const output = error.stdout || '';
    const cadence = output ? parseCadenceOutput(output) : null;

    return NextResponse.json({
      cadence,
      followUps: [],
      error: error.message,
      careerOpsPath,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);

    if (action === 'draft') {
      const templates: Record<string, Record<number, string>> = {
        email: {
          1: `Hi,\n\nI wanted to follow up on my application for the ${data.role || 'position'} at ${data.company}. I remain very excited about this opportunity.\n\nBest regards`,
          2: `Hi,\n\nFollowing up on my application for the ${data.role || 'position'} at ${data.company}. I am still very interested and would love to discuss how I can contribute.\n\nBest regards`,
          3: `Hi,\n\nI wanted to follow up once more on my ${data.role || 'position'} application at ${data.company}. If the position has been filled, I would appreciate any feedback.\n\nThank you`,
        },
        linkedin: {
          1: `Hi! I recently applied for the ${data.role || 'position'} and wanted to connect. Very excited about this opportunity!`,
          2: `Hi! Following up on my ${data.role || 'position'} application. Still very interested!`,
          3: `Hi! Just wanted to reaffirm my interest in the ${data.role || 'position'} at ${data.company}.`,
        },
      };

      const channel = data.channel || 'email';
      const followUpNumber = data.followUpNumber || 1;
      const message = templates[channel]?.[followUpNumber] || templates.email[1];

      return NextResponse.json({
        success: true,
        message,
        channel,
        followUpNumber,
        company: data.company,
        role: data.role,
      });
    }

    if (action === 'record') {
      try {
        const followUpsPath = path.join(careerOpsPath, 'data', 'follow-ups.md');
        await fs.mkdir(path.join(careerOpsPath, 'data'), { recursive: true });

        const entry = `| ${data.company} | ${data.date} | ${data.channel} | ${data.message?.slice(0, 80) || ''} |\n`;

        let content = '';
        try {
          content = await fs.readFile(followUpsPath, 'utf-8');
        } catch {
          content = `# Follow-ups\n\n| Company | Date | Channel | Message |\n|---|---|---|---|\n`;
        }

        if (content.includes('|---|---|---|---|')) {
          const separatorIdx = content.indexOf('|---|---|---|---|');
          const afterSeparator = content.indexOf('\n', separatorIdx) + 1;
          content = content.slice(0, afterSeparator) + entry + content.slice(afterSeparator);
        } else {
          content += entry;
        }

        await fs.writeFile(followUpsPath, content, 'utf-8');

        return NextResponse.json({ success: true, recorded: data });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to record follow-up',
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Failed to process follow-up',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

function parseCadenceOutput(output: string): any {
  const cadence: any = { urgent: [], overdue: [], waiting: [], cold: [] };
  const lines = output.split('\n');
  let currentCategory = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const title = trimmed.toLowerCase().replace(/^#+\s*/, '');
      if (title.includes('urgent') || title.includes('today')) currentCategory = 'urgent';
      else if (title.includes('overdue')) currentCategory = 'overdue';
      else if (title.includes('waiting') || title.includes('schedule')) currentCategory = 'waiting';
      else if (title.includes('cold')) currentCategory = 'cold';
    } else if (trimmed.startsWith('|') && currentCategory) {
      const fields = trimmed.split('|').map(f => f.trim()).filter(f => f);
      if (fields[0] === 'Company' || fields[0] === '---' || fields[0] === '#') continue;
      if (fields.length >= 2) {
        (cadence[currentCategory] as any[]).push({
          company: fields[0],
          status: fields[1] || '',
          daysSince: fields[2] || '',
        });
      }
    }
  }

  return cadence;
}

async function loadFollowUps(careerOpsPath: string): Promise<any[]> {
  try {
    const content = await fs.readFile(path.join(careerOpsPath, 'data', 'follow-ups.md'), 'utf-8');
    const items: any[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('|---') || trimmed.startsWith('| Company')) continue;
      if (trimmed.startsWith('|')) {
        const fields = trimmed.slice(1, -1).split('|').map(f => f.trim());
        if (fields.length >= 3) {
          items.push({
            company: fields[0],
            date: fields[1],
            channel: fields[2],
            message: fields[3] || '',
          });
        }
      }
    }
    return items;
  } catch {
    return [];
  }
}
