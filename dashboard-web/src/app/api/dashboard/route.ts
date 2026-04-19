import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCareerOpsPath } from '@/lib/career-ops-path';
import { parseApplications, normalizeStatus, computeMetrics, computeProgressMetrics, loadReportSummary } from '@/lib/data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  try {
    let applications: any[] = [];
    let filePath = path.join(careerOpsPath, 'applications.md');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      applications = parseApplications(careerOpsPath, content);
    } catch {
      filePath = path.join(careerOpsPath, 'data', 'applications.md');
      const content = await fs.readFile(filePath, 'utf-8');
      applications = parseApplications(careerOpsPath, content);
    }

    const metrics = computeMetrics(applications);
    const progressMetrics = computeProgressMetrics(applications);

    let reportCache: Record<string, any> = {};
    try {
      const reportsDir = path.join(careerOpsPath, 'reports');
      const files = await fs.readdir(reportsDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const reportContent = await fs.readFile(path.join(reportsDir, file), 'utf-8');
          reportCache[`reports/${file}`] = loadReportSummary(reportContent);
        }
      }
    } catch { /* Reports dir doesn't exist */ }

    let pipelineItems: any[] = [];
    try {
      const pipelinePath = path.join(careerOpsPath, 'data', 'pipeline.md');
      const pipelineContent = await fs.readFile(pipelinePath, 'utf-8');
      pipelineItems = parsePipeline(pipelineContent);
    } catch { /* No pipeline */ }

    let followUps: any[] = [];
    try {
      const followUpsPath = path.join(careerOpsPath, 'data', 'follow-ups.md');
      const followUpsContent = await fs.readFile(followUpsPath, 'utf-8');
      followUps = parseFollowUps(followUpsContent);
    } catch { /* No follow-ups */ }

    return NextResponse.json({
      applications,
      metrics,
      progressMetrics,
      reportCache,
      pipelineItems,
      followUps,
      careerOpsPath
    });
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}

function parsePipeline(content: string): any[] {
  const lines = content.split('\n');
  const items: any[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      items.push({
        url: urlMatch[0],
        dateAdded: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
    }
  }

  return items;
}

function parseFollowUps(content: string): any[] {
  const lines = content.split('\n');
  const items: any[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const fields = trimmed.split('|').map(f => f.trim());
    if (fields.length >= 3) {
      items.push({
        company: fields[0],
        lastFollowUp: fields[1],
        status: fields[2]
      });
    }
  }

  return items;
}
