import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MCP_SERVER_PATH = path.join(__dirname, 'server.mjs');

export class CareerOpsMCP {
  careerOpsPath: string;
  process: ChildProcess | null;

  constructor(careerOpsPath: string) {
    this.careerOpsPath = careerOpsPath;
    this.process = null;
  }

  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.process = spawn('node', [MCP_SERVER_PATH], {
        cwd: this.careerOpsPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CAREER_OPS_PATH: this.careerOpsPath },
      });

      let ready = false;
      let buffer = '';

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          const msg = data.toString();
          if (msg.includes('running')) {
            ready = true;
            resolve();
          }
        });
      }

      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          buffer += data.toString();
        });
      }

      this.process.on('error', reject);

      setTimeout(() => {
        if (!ready) {
          reject(new Error('MCP server timeout'));
        }
      }, 10000);
    });
  }

  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    if (!this.process) {
      await this.connect();
    }

    const proc = this.process!;

    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    return new Promise((resolve, reject) => {
      let responseBuffer = '';
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Tool ${name} timed out`));
        }
      }, 180000);

      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          if (resolved) return;

          responseBuffer += data.toString();

          try {
            const lines = responseBuffer.split('\n');
            for (const line of lines) {
              if (line.trim()) {
                const response = JSON.parse(line);
                if (response.id === request.id) {
                  resolved = true;
                  clearTimeout(timeout);
                  if (response.error) {
                    reject(new Error(response.error.message || 'Tool error'));
                  } else {
                    resolve(response.result);
                  }
                }
              }
            }
          } catch {
            // Not complete JSON yet
          }
        });
      }

      if (proc.stdin) {
        proc.stdin.write(JSON.stringify(request) + '\n');
      }
    });
  }

  async evaluateJob(jdText: string, jdUrl: string, company: string, role: string) {
    const result = await this.callTool('evaluate_job', {
      jd_text: jdText,
      jd_url: jdUrl,
      company,
      role,
    });

    const text = result.content?.[0]?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { report: text, evaluation: {} };
      }
    }
    return result;
  }

  async scanPortals(mode: string = 'quick') {
    const result = await this.callTool('scan_portals', { mode });
    const text = result.content?.[0]?.text;
    return text ? JSON.parse(text) : result;
  }

  async generateCV(company: string, role: string, jdText: string) {
    const result = await this.callTool('generate_cv', { company, role, jd_text: jdText });
    const text = result.content?.[0]?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { cv_html: text };
      }
    }
    return result;
  }

  async followupCadence(action: string, data: Record<string, any> = {}) {
    const result = await this.callTool('followup_cadence', { action, ...data });
    const text = result.content?.[0]?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { cadence: text };
      }
    }
    return result;
  }

  async patternAnalysis(): Promise<any> {
    const result = await this.callTool('pattern_analysis', {});
    const text = result.content?.[0]?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { analysis: text };
      }
    }
    return result;
  }

  async deepResearch(company: string, role: string) {
    const result = await this.callTool('deep_research', { company, role });
    const text = result.content?.[0]?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { research: text };
      }
    }
    return result;
  }

  async interviewPrep(company: string, role: string, jdText: string) {
    const result = await this.callTool('interview_prep', { company, role, jd_text: jdText });
    const text = result.content?.[0]?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { prep: text };
      }
    }
    return result;
  }

  async updateApplicationStatus(reportNumber: string, newStatus: string) {
    const result = await this.callTool('update_application_status', {
      report_number: reportNumber,
      new_status: newStatus,
    });
    const text = result.content?.[0]?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { result: text };
      }
    }
    return result;
  }

  async getApplications(): Promise<any> {
    const result = await this.callTool('get_applications', {});
    const text = result.content?.[0]?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { applications: text };
      }
    }
    return result;
  }

  disconnect() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

let instance: CareerOpsMCP | null = null;

export function getCareerOpsMCP(careerOpsPath: string): CareerOpsMCP {
  if (!instance || instance.careerOpsPath !== careerOpsPath) {
    if (instance) {
      instance.disconnect();
    }
    instance = new CareerOpsMCP(careerOpsPath);
  }
  return instance;
}