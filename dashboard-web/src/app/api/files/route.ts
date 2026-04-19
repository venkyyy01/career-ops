import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCareerOpsPath, safePath } from '@/lib/career-ops-path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const careerOpsPath = getCareerOpsPath(null);

  const fullPath = safePath(careerOpsPath, filePath);
  if (!fullPath) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
  }

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    const content = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const fileName = path.basename(fullPath);

    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.json': 'application/json',
    };

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentTypes[ext] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-cache, no-store',
      },
    });
  } catch (error) {
    console.error('File read error:', error);
    return NextResponse.json({
      error: 'File not found',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 404 });
  }
}
