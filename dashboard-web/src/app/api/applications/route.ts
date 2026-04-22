import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCareerOpsPath } from '@/lib/career-ops-path';
import { parseApplications, computeMetrics, computeProgressMetrics, loadReportSummary } from '@/lib/data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  try {
    let content = '';
    let filePath = path.join(careerOpsPath, 'applications.md');
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      filePath = path.join(careerOpsPath, 'data', 'applications.md');
      content = await fs.readFile(filePath, 'utf-8');
    }

    const apps = parseApplications(careerOpsPath, content);
    const metrics = computeMetrics(apps);
    const progressMetrics = computeProgressMetrics(apps);

    let reportCache: Record<string, any> = {};
    try {
      const reportsDir = path.join(careerOpsPath, 'reports');
      const files = await fs.readdir(reportsDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          try {
            const reportContent = await fs.readFile(path.join(reportsDir, file), 'utf-8');
            reportCache[`reports/${file}`] = loadReportSummary(reportContent);
          } catch { /* skip unreadable */ }
        }
      }
    } catch { /* no reports dir */ }

    return NextResponse.json({
      apps,
      metrics,
      progressMetrics,
      reportCache,
      careerOpsPath,
    });
  } catch (error) {
    console.error('Error loading applications:', error);
    return NextResponse.json({
      error: 'Failed to load applications',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
