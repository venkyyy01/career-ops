import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCareerOpsPath, safePath } from '@/lib/career-ops-path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const careerOpsPath = getCareerOpsPath(searchParams.get('path'));
    const reportPath = decodeURIComponent(params.path);

    const fullPath = safePath(careerOpsPath, reportPath);
    if (!fullPath) {
      return NextResponse.json({ error: 'Invalid report path' }, { status: 403 });
    }

    const content = await fs.readFile(fullPath, 'utf-8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading report:', error);
    return NextResponse.json({ error: 'Failed to read report' }, { status: 500 });
  }
}
