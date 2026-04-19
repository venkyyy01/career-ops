import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { updateApplicationStatus } from '@/lib/data';
import { getCareerOpsPath } from '@/lib/career-ops-path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { careerOpsPath, reportNumber, newStatus } = body;

    if (!reportNumber || !newStatus) {
      return NextResponse.json({ error: 'Missing reportNumber or newStatus' }, { status: 400 });
    }

    const basePath = getCareerOpsPath(careerOpsPath);

    let filePath = path.join(basePath, 'applications.md');
    let content: string;

    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      filePath = path.join(basePath, 'data', 'applications.md');
      content = await fs.readFile(filePath, 'utf-8');
    }

    const updated = updateApplicationStatus(content, reportNumber, newStatus);
    await fs.writeFile(filePath, updated, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}