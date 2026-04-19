import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { getCareerOpsPath } from '@/lib/career-ops-path';

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'status', jobUrls = [], careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);

    if (action === 'add') {
      const result = await addJobsToBatch(jobUrls, careerOpsPath);
      return NextResponse.json(result);
    }

    if (action === 'process') {
      const result = await runBatchProcess(careerOpsPath);
      return NextResponse.json(result);
    }

    const status = await getBatchStatus(careerOpsPath);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Batch error:', error);
    return NextResponse.json({
      error: 'Failed to process batch',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  const status = await getBatchStatus(careerOpsPath);
  return NextResponse.json(status);
}

async function addJobsToBatch(jobUrls: string[], careerOpsPath: string): Promise<any> {
  const batchInputPath = path.join(careerOpsPath, 'batch', 'batch-input.tsv');
  const batchDir = path.join(careerOpsPath, 'batch');

  await fs.mkdir(batchDir, { recursive: true });

  let existingUrls = new Set<string>();

  try {
    const existing = await fs.readFile(batchInputPath, 'utf-8');
    const lines = existing.split('\n');
    for (const line of lines) {
      const fields = line.split('\t');
      if (fields.length >= 2 && fields[1]) {
        existingUrls.add(fields[1]);
      }
    }
  } catch { /* No existing batch */ }

  const newUrls = jobUrls.filter(url => !existingUrls.has(url));

  if (newUrls.length === 0) {
    return { success: true, added: 0, message: 'All URLs already in batch' };
  }

  const newLines = newUrls.map((url, i) => {
    const id = Date.now() + i;
    const date = new Date().toISOString().split('T')[0];
    return `${id}\t${url}\tmanual\tAdded ${date}`;
  });

  const header = 'id\turl\tsource\tnotes\n';
  let existingContent = '';

  try {
    existingContent = await fs.readFile(batchInputPath, 'utf-8');
    if (!existingContent.startsWith('id\t')) {
      existingContent = header + existingContent;
    }
  } catch {
    existingContent = header;
  }

  await fs.writeFile(batchInputPath, existingContent + newLines.join('\n') + '\n', 'utf-8');

  return {
    success: true,
    added: newUrls.length,
    total: existingUrls.size + newUrls.length
  };
}

async function runBatchProcess(careerOpsPath: string): Promise<any> {
  const batchScript = path.join(careerOpsPath, 'batch', 'batch-process.sh');
  const batchInputPath = path.join(careerOpsPath, 'batch', 'batch-input.tsv');

  try {
    const input = await fs.readFile(batchInputPath, 'utf-8');
    const lines = input.split('\n').filter(l => l.trim() && !l.startsWith('id\t'));
  } catch { /* No batch */ }

  try {
    await execFileAsync('bash', [batchScript], {
      cwd: careerOpsPath,
      timeout: 300000,
    });
  } catch (error: any) {
    console.error('Batch process error:', error.message);
  }

  const batchState = await getBatchStatus(careerOpsPath);

  return {
    success: true,
    ...batchState,
    message: 'Batch process initiated'
  };
}

async function getBatchStatus(careerOpsPath: string): Promise<any> {
  const batchDir = path.join(careerOpsPath, 'batch');
  const statePath = path.join(batchDir, 'batch-state.tsv');
  const inputPath = path.join(batchDir, 'batch-input.tsv');

  let total = 0;
  let completed = 0;
  let processing = 0;
  let failed = 0;
  const completedUrls = new Set<string>();
  const failedUrls = new Set<string>();
  let pending: any[] = [];

  try {
    const state = await fs.readFile(statePath, 'utf-8');
    const lines = state.split('\n').filter(l => l.trim() && !l.startsWith('id\t'));

    for (const line of lines) {
      const fields = line.split('\t');
      if (fields.length >= 3) {
        const url = fields[1] || '';
        const status = fields[2].toLowerCase();
        if (status === 'completed' || status === 'done' || status === 'success') {
          completed++;
          if (url) completedUrls.add(url);
        } else if (status === 'processing' || status === 'running') {
          processing++;
        } else if (status === 'failed' || status === 'error') {
          failed++;
          if (url) failedUrls.add(url);
        }
      }
    }
  } catch { /* No state file */ }

  try {
    const input = await fs.readFile(inputPath, 'utf-8');
    const lines = input.split('\n').filter(l => l.trim() && !l.startsWith('id\t'));
    total = lines.length;

    for (const line of lines) {
      const fields = line.split('\t');
      if (fields.length >= 2) {
        const url = fields[1];
        if (!completedUrls.has(url) && !failedUrls.has(url)) {
          pending.push({
            id: fields[0],
            url,
            source: fields[2] || 'unknown'
          });
        }
      }
    }
  } catch { /* No batch */ }

  return {
    total,
    completed,
    processing,
    failed,
    pending: pending.slice(0, 20),
    progress: total > 0 ? Math.round(((completed + failed) / total) * 100) : 0
  };
}
