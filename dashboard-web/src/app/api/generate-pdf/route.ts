import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import { getCareerOpsPath } from '@/lib/career-ops-path';

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  const tempHtmlPath = path.join(os.tmpdir(), `cv-${Date.now()}.html`);

  try {
    const body = await request.json();
    const { company, role, jdText, careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);

    const cvPath = path.join(careerOpsPath, 'cv.md');
    let cvContent = '';

    try {
      cvContent = await fs.readFile(cvPath, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'cv.md not found in career-ops root' }, { status: 400 });
    }

    const templatePath = path.join(careerOpsPath, 'templates', 'cv-template.html');
    let templateExists = false;

    try {
      await fs.access(templatePath);
      templateExists = true;
    } catch { /* No template */ }

    const outputDir = path.join(careerOpsPath, 'output');
    await fs.mkdir(outputDir, { recursive: true });

    const date = new Date().toISOString().split('T')[0];
    const companySlug = (company || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const outputFileName = `cv-${companySlug}-${date}.pdf`;
    const outputPath = path.join(outputDir, outputFileName);

    let htmlContent = '';
    if (templateExists && jdText) {
      htmlContent = await generateCustomHTML(cvContent, jdText, templatePath, careerOpsPath);
    } else if (templateExists) {
      htmlContent = await fs.readFile(templatePath, 'utf-8');
      htmlContent = injectCVContent(htmlContent, cvContent);
    } else {
      htmlContent = generateDefaultHTML(cvContent, company || 'General');
    }

    await fs.writeFile(tempHtmlPath, htmlContent);

    try {
      await execFileAsync('node', [
        path.join(careerOpsPath, 'generate-pdf.mjs'),
        tempHtmlPath,
        outputPath
      ], {
        cwd: careerOpsPath,
        timeout: 60000,
      });
    } catch (error) {
      console.error('PDF generation error:', error);

      const fallbackHtml = generateFallbackPDF(cvContent, company || 'General', role || '');
      await fs.writeFile(outputPath.replace('.pdf', '.html'), fallbackHtml, 'utf-8');

      await fs.unlink(tempHtmlPath).catch(() => {});

      return NextResponse.json({
        success: false,
        error: 'PDF generation failed, HTML fallback created',
        outputPath: outputPath.replace('.pdf', '.html'),
        outputUrl: `/api/files?path=${encodeURIComponent(outputPath.replace('.pdf', '.html'))}`
      });
    }

    await fs.unlink(tempHtmlPath).catch(() => {});

    return NextResponse.json({
      success: true,
      outputPath,
      outputUrl: `/api/files?path=${encodeURIComponent(outputPath)}`,
      fileName: outputFileName
    });
  } catch (error) {
    await fs.unlink(tempHtmlPath).catch(() => {});
    console.error('PDF generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function generateCustomHTML(cvContent: string, jdText: string, templatePath: string, _careerOpsPath: string): Promise<string> {
  const template = await fs.readFile(templatePath, 'utf-8');

  const jdKeywords = extractKeywords(jdText);

  let modifiedCV = cvContent;

  modifiedCV = injectKeywords(modifiedCV, jdKeywords);

  return injectCVContent(template, modifiedCV);
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'about', 'up', 'out', 'if', 'because', 'until', 'while']);

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const frequency: Record<string, number> = {};
  for (const word of words) {
    frequency[word] = (frequency[word] || 0) + 1;
  }

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

function injectKeywords(cvContent: string, keywords: string[]): string {
  const lines = cvContent.split('\n');
  let inSummary = false;
  let summaryEndIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('summary') || lower.includes('objective') || lower.includes('profile')) {
      inSummary = true;
    }
    if (inSummary && (lines[i].trim() === '' || lower.startsWith('#') || lower.startsWith('##'))) {
      if (i > 0 && lines[i].trim() !== '') {
        summaryEndIdx = i;
      } else {
        summaryEndIdx = i;
      }
      inSummary = false;
    }
  }

  if (summaryEndIdx >= 0 && keywords.length > 0) {
    const keywordPhrase = keywords.slice(0, 8).join(', ');
    lines.splice(summaryEndIdx, 0, `\nKeywords: ${keywordPhrase}\n`);
  }

  return lines.join('\n');
}

function injectCVContent(template: string, cvContent: string): string {
  let html = template;

  const sections = parseSimpleMarkdown(cvContent);

  const sectionHtml = Object.entries(sections)
    .map(([title, content]) => `<div class="section"><h2>${escapeHtml(title)}</h2>${content}</div>`)
    .join('\n');

  html = html.replace('{{CV_CONTENT}}', sectionHtml);
  html = html.replace('{{DATE}}', new Date().toLocaleDateString());

  return html;
}

function parseSimpleMarkdown(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split('\n');
  let currentSection = 'Other';
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('<br>');
      }
      currentSection = trimmed.slice(2);
      currentContent = [];
    } else if (trimmed.startsWith('## ')) {
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('<br>');
      }
      currentSection = trimmed.slice(3);
      currentContent = [];
    } else if (trimmed) {
      currentContent.push(escapeHtml(trimmed));
    }
  }

  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('<br>');
  }

  return sections;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateDefaultHTML(cvContent: string, company: string): string {
  const sections = parseSimpleMarkdown(cvContent);
  const sectionsHtml = Object.entries(sections)
    .map(([title, content]) => `<div class="section"><h2>${escapeHtml(title)}</h2><p>${content}</p></div>`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CV - ${escapeHtml(company)}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11pt; line-height: 1.5; color: #333; background: white; padding: 40px; }
.section { margin-bottom: 20px; }
h1 { font-size: 24pt; color: #1a1a1a; margin-bottom: 5px; }
h2 { font-size: 12pt; color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
p { margin-bottom: 5px; }
.header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
@media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="header">
<h1>Professional Profile</h1>
<p>Generated for: ${escapeHtml(company)}</p>
<p>Date: ${new Date().toLocaleDateString()}</p>
</div>
${sectionsHtml}
</body>
</html>`;
}

function generateFallbackPDF(cvContent: string, company: string, role: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>CV - ${escapeHtml(company)}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; color: #333; background: white; padding: 50px; max-width: 800px; margin: 0 auto; }
h1 { font-size: 28pt; color: #1a1a1a; margin-bottom: 10px; }
h2 { font-size: 14pt; color: #2563eb; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
p { margin-bottom: 8px; }
.header { text-align: center; margin-bottom: 30px; }
.meta { color: #666; font-size: 10pt; }
pre { white-space: pre-wrap; font-family: inherit; }
@media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
<h1>Curriculum Vitae</h1>
<p class="meta">Target: ${escapeHtml(company)} ${role ? '| ' + escapeHtml(role) : ''}</p>
<p class="meta">Generated: ${new Date().toLocaleDateString()}</p>
</div>
<pre>${escapeHtml(cvContent)}</pre>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  const outputDir = path.join(careerOpsPath, 'output');

  let files: any[] = [];

  try {
    const entries = await fs.readdir(outputDir);
    for (const entry of entries) {
      const fullPath = path.join(outputDir, entry);
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) {
        files.push({
          name: entry,
          path: fullPath,
          size: stat.size,
          modified: stat.mtime.toISOString()
        });
      }
    }
  } catch { /* No output dir */ }

  return NextResponse.json({ files });
}
