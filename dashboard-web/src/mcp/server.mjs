#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const CAREER_OPS_PATH = process.cwd();

const TOOLS = [
  {
    name: 'evaluate_job',
    description: 'Evaluate a job posting with A-F scoring. Input: job description text or URL.',
    inputSchema: {
      type: 'object',
      properties: {
        jd_text: { type: 'string', description: 'Job description text' },
        jd_url: { type: 'string', description: 'Job posting URL' },
        company: { type: 'string', description: 'Company name' },
        role: { type: 'string', description: 'Role title' },
      },
    },
  },
  {
    name: 'scan_portals',
    description: 'Scan configured job portals for new postings',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['quick', 'full'], default: 'quick' },
      },
    },
  },
  {
    name: 'generate_cv',
    description: 'Generate an ATS-optimized PDF CV tailored to a job description',
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Target company name' },
        role: { type: 'string', description: 'Target role' },
        jd_text: { type: 'string', description: 'Job description for keyword optimization' },
      },
    },
  },
  {
    name: 'followup_cadence',
    description: 'Get follow-up cadence status and generate follow-up drafts',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['status', 'draft', 'record'] },
        company: { type: 'string' },
        role: { type: 'string' },
        channel: { type: 'string', enum: ['email', 'linkedin'] },
        follow_up_number: { type: 'number' },
      },
    },
  },
  {
    name: 'pattern_analysis',
    description: 'Analyze rejection patterns across all applications',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'deep_research',
    description: 'Conduct deep research on a company',
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Company name' },
        role: { type: 'string', description: 'Target role' },
      },
    },
  },
  {
    name: 'interview_prep',
    description: 'Generate interview preparation material for a company',
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Company name' },
        role: { type: 'string', description: 'Target role' },
        jd_text: { type: 'string', description: 'Job description' },
      },
    },
  },
  {
    name: 'update_application_status',
    description: 'Update the status of an application in the tracker',
    inputSchema: {
      type: 'object',
      properties: {
        report_number: { type: 'string', description: 'Report number' },
        new_status: { type: 'string', description: 'New status' },
      },
    },
  },
  {
    name: 'get_applications',
    description: 'Get all applications from the tracker',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

const server = new Server(
  {
    name: 'career-ops',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'evaluate_job':
        result = await evaluateJob(args);
        break;
      case 'scan_portals':
        result = await scanPortals(args);
        break;
      case 'generate_cv':
        result = await generateCV(args);
        break;
      case 'followup_cadence':
        result = await followupCadence(args);
        break;
      case 'pattern_analysis':
        result = await patternAnalysis(args);
        break;
      case 'deep_research':
        result = await deepResearch(args);
        break;
      case 'interview_prep':
        result = await interviewPrep(args);
        break;
      case 'update_application_status':
        result = await updateApplicationStatus(args);
        break;
      case 'get_applications':
        result = await getApplications(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
      isError: true,
    };
  }
});

import { execSync, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

async function evaluateJob(args) {
  const { jd_text, jd_url, company, role } = args;

  const prompt = buildEvaluationPrompt(jd_text || jd_url, company, role);

  const output = await runClaudePrompt(prompt);

  return parseEvaluationOutput(output);
}

function buildEvaluationPrompt(jdContent, company, role) {
  return `You are evaluating a job posting. Perform a comprehensive A-G evaluation.

${jdContent ? `Job Description:\n${jdContent}` : `Job URL: ${jd_url}`}

Generate a detailed evaluation report with:

## Block A: Role Summary
- **Arquetipo:** [Role archetype]
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
- **Arquetipo:** [Archetype name]

Format as Markdown.`;
}

async function runClaudePrompt(prompt) {
  return new Promise((resolve, reject) => {
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const child = exec(
      `claude -p --output-format stream-json "${escaped.slice(0, 100000)}" 2>/dev/null`,
      { cwd: CAREER_OPS_PATH, timeout: 180000 },
      (error, stdout, stderr) => {
        if (error && !stdout) {
          reject(new Error(`Claude error: ${stderr || error.message}`));
          return;
        }
        resolve(stdout || '');
      }
    );

    let output = '';
    child.stdout?.on('data', (data) => { output += data.toString(); });

    setTimeout(() => {
      child.kill();
      resolve(output);
    }, 180000);
  });
}

function parseEvaluationOutput(output) {
  const lines = output.split('\n');
  let report = '';
  let inJson = false;

  for (const line of lines) {
    if (line.trim().startsWith('{') || inJson) {
      inJson = true;
      report += line + '\n';
    }
  }

  if (!report.trim()) {
    report = output;
  }

  const scoreMatch = output.match(/\*\*Overall Score:\*\*\s*(\d+\.?\d*)/i) ||
                    output.match(/Score:\s*(\d+\.?\d*)/i);
  const archetypeMatch = output.match(/\*\*Arquetipo:\*\*\s*([^\n|]+)/i);
  const tldrMatch = output.match(/\*\*TL;DR:\*\*\s*([^\n]+)/i);
  const compMatch = output.match(/\*\*Comp:\*\*\s*([^\n]+)/i);
  const remoteMatch = output.match(/\*\*Remote:\*\*\s*([^\n]+)/i);

  return {
    report: output,
    evaluation: {
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
      archetype: archetypeMatch ? archetypeMatch[1].trim() : '',
      tldr: tldrMatch ? tldrMatch[1].trim() : '',
      comp: compMatch ? compMatch[1].trim() : '',
      remote: remoteMatch ? remoteMatch[1].trim() : '',
    },
  };
}

async function scanPortals(args) {
  const { mode = 'quick' } = args;

  try {
    const output = execSync(`node "${path.join(CAREER_OPS_PATH, 'scan.mjs')}" 2>&1`, {
      cwd: CAREER_OPS_PATH,
      timeout: 120000,
      encoding: 'utf-8',
    });

    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

async function generateCV(args) {
  const { company, role, jd_text } = args;

  const prompt = `Generate an ATS-optimized CV for ${role || 'the position'} at ${company}.

${jd_text ? `Based on this job description:\n${jd_text}\n\n` : ''}

Create a tailored CV that:
1. Uses keywords from the job description naturally
2. Highlights relevant experience and projects
3. Is formatted for ATS systems (simple layout, no tables)
4. Is 1-2 pages maximum

Output the CV as clean HTML suitable for PDF conversion.`;

  const output = await runClaudePrompt(prompt);

  return { cv_html: output };
}

async function followupCadence(args) {
  const { action = 'status', company, channel = 'email', follow_up_number = 1 } = args;

  if (action === 'status') {
    try {
      const output = execSync(`node "${path.join(CAREER_OPS_PATH, 'followup-cadence.mjs')}" 2>&1`, {
        cwd: CAREER_OPS_PATH,
        timeout: 60000,
        encoding: 'utf-8',
      });
      return { cadence: output };
    } catch (error) {
      return { error: error.message };
    }
  }

  if (action === 'draft') {
    const templates = {
      email: {
        1: `Hi,

I wanted to follow up on my application for the ${role || 'position'} at ${company}. I remain very excited about this opportunity.

Best regards`,
        2: `Hi,

Following up on my application for the ${role || 'position'} at ${company}. I am still very interested and would love to discuss how I can contribute.

Best regards`,
        3: `Hi,

I wanted to follow up once more on my ${role || 'position'} application at ${company}. If the position has been filled, I would appreciate any feedback.

Thank you`,
      },
      linkedin: {
        1: `Hi! I recently applied for the ${role || 'position'} and wanted to connect. Very excited about this opportunity!`,
        2: `Hi! Following up on my ${role || 'position'} application. Still very interested!`,
        3: `Hi! Just wanted to reaffirm my interest in the ${role || 'position'} at ${company}.`,
      },
    };

    const message = templates[channel]?.[follow_up_number] || templates.email[1];

    return { message, channel, follow_up_number, company, role };
  }

  return { error: 'Unknown action' };
}

async function patternAnalysis(args) {
  try {
    const output = execSync(`node "${path.join(CAREER_OPS_PATH, 'analyze-patterns.mjs')}" 2>&1`, {
      cwd: CAREER_OPS_PATH,
      timeout: 60000,
      encoding: 'utf-8',
    });
    return { analysis: output };
  } catch (error) {
    return { error: error.message };
  }
}

async function deepResearch(args) {
  const { company, role } = args;

  const prompt = `# Deep Company Research: ${company}

Research and provide comprehensive intel on:

## 1. AI Strategy & Products
What AI/ML products? Tech stack? Engineering blog topics?

## 2. Recent Movements
Recent hires, acquisitions, funding, pivots, leadership changes?

## 3. Engineering Culture
Deploy cadence? Mono or multi-repo? Remote policy? Tech stack?

## 4. Probable Challenges
Scaling challenges? Reliability issues? Technical debt?

## 5. Competitive Landscape
Main competitors? Differentiation?

## 6. Candidate Value Prop
Why work here? Projects you'd work on?

## 7. Interview Prep
Likely technical topics? Behavioral themes? Questions to ask?

Format as detailed Markdown.`;

  const output = await runClaudePrompt(prompt);

  return { research: output, company, role };
}

async function interviewPrep(args) {
  const { company, role, jd_text } = args;

  const prompt = `Generate interview preparation material for ${company}${role ? ` - ${role}` : ''}.

${jd_text ? `Based on this job description:\n${jd_text}\n\n` : ''}

Include:
1. Interview process overview
2. Round-by-round breakdown
3. Likely technical and behavioral questions
4. Company-specific signals and culture
5. Questions to ask that impress
6. Red flags to watch for

Format as comprehensive Markdown.`;

  const output = await runClaudePrompt(prompt);

  return { prep: output, company, role };
}

async function updateApplicationStatus(args) {
  const { report_number, new_status } = args;

  const appsPath = path.join(CAREER_OPS_PATH, 'data', 'applications.md');

  try {
    let content = await fs.readFile(appsPath, 'utf-8');

    const regex = new RegExp(`\\[${report_number}\\]\\([^)]+\\)`, 'g');
    content = content.replace(regex, (match) => {
      const parts = match.slice(0, -1).split('|');
      if (parts.length >= 6) {
        parts[5] = ` ${new_status}`;
        return parts.join('|') + ')';
      }
      return match;
    });

    await fs.writeFile(appsPath, content, 'utf-8');

    return { success: true, report_number, new_status };
  } catch (error) {
    return { error: error.message };
  }
}

async function getApplications(args) {
  const appsPath = path.join(CAREER_OPS_PATH, 'data', 'applications.md');

  try {
    const content = await fs.readFile(appsPath, 'utf-8');
    return { applications: content };
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Career-ops MCP server running');
}

main().catch(console.error);