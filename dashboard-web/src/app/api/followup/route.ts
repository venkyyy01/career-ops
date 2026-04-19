import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCareerOpsPath } from '@/lib/career-ops-path';
import { getCareerOpsMCP } from '@/mcp/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  const mcp = getCareerOpsMCP(careerOpsPath);

  try {
    const result = await mcp.followupCadence('status');

    return NextResponse.json({
      cadence: typeof result === 'string' ? result : result.cadence,
      careerOpsPath
    });
  } catch (error) {
    console.error('Error getting followup cadence:', error);
    return NextResponse.json({
      error: 'Failed to get follow-up data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);
    const mcp = getCareerOpsMCP(careerOpsPath);

    if (action === 'draft') {
      try {
        const result = await mcp.followupCadence('draft', {
          company: data.company,
          role: data.role,
          channel: data.channel || 'email',
          follow_up_number: data.followUpNumber || 1,
        });

        return NextResponse.json({
          success: true,
          ...result
        });
      } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    if (action === 'record') {
      try {
        const followUpsPath = path.join(careerOpsPath, 'data', 'follow-ups.md');
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

        return NextResponse.json({
          success: true,
          recorded: data
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to record follow-up'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Failed to process follow-up',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
