'use client';

import { useState, useEffect } from 'react';
import { usePipeline } from '@/lib/context';
import { Card, Input, ActionButton, StatusBadge } from '@/components/ui/features';
import { Modal } from '@/components/ui/modal';
import { FileText, ExternalLink, Check, Loader2 } from 'lucide-react';
import { STATUS_OPTIONS } from '@/types/pipeline';
import { Select } from '@/components/ui/select';

export function EvaluatePanel() {
  const { careerOpsPath, refresh } = usePipeline();
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [company, setCompany] = useState('');

  const evaluate = async () => {
    if (!jdText && !jdUrl) {
      setError('Please provide either a job description or URL');
      return;
    }

    setStatus('loading');
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText, jdUrl, careerOpsPath })
      });

      const data = await res.json();

      if (data.error) {
        setStatus('error');
        setError(data.error);
      } else {
        setStatus('success');
        setResult(data);
      if (data.evaluation?.archetype) {
        const archMatch = data.report.match(/\*\*(?:Arquetipo|Archetype):\*\*\s*([^\n|]+)/i);
        if (archMatch) setCompany(archMatch[1].trim());
        }
      }
    } catch (e) {
      setStatus('error');
      setError('Failed to evaluate job description');
    }
  };

  const saveReport = async () => {
    if (!result?.report) return;

    setSaveStatus('loading');

    try {
      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addReport',
          report: result.report,
          evaluation: result.evaluation,
          careerOpsPath
        })
      });

      setSaveStatus('success');
      setTimeout(() => {
        setSaveModalOpen(false);
        setSaveStatus('idle');
      }, 1000);
    } catch {
      setSaveStatus('error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Job Offer Evaluation" description="Paste a job description or URL to perform A-F evaluation">
          <div className="space-y-4">
            <Input
              label="Job URL (optional)"
              placeholder="https://careers.company.com/jobs/123"
              value={jdUrl}
              onChange={setJdUrl}
              hint="Paste a job posting URL"
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2a2a38]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-[#1a1a21] text-xs text-slate-500">or paste job description</span>
              </div>
            </div>

            <Input
              label="Job Description"
              placeholder="Paste the full job description here..."
              value={jdText}
              onChange={setJdText}
              multiline
              rows={12}
            />

            <div className="flex items-center gap-3">
              <ActionButton onClick={evaluate} loading={status === 'loading'} disabled={!jdText && !jdUrl}>
                <FileText className="w-4 h-4" />
                Evaluate
              </ActionButton>

              {status === 'error' && <StatusBadge status="error" message={error} />}
            </div>
          </div>
        </Card>

        {result && (
          <Card
            title="Evaluation Results"
            description={`Score: ${result.evaluation?.score || 'N/A'}/5`}
            actions={
              <ActionButton onClick={() => setSaveModalOpen(true)} variant="secondary" size="sm">
                <Check className="w-4 h-4" />
                Save Report
              </ActionButton>
            }
          >
            <div className="space-y-4">
              {result.evaluation?.archetype && (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-sky-400 uppercase tracking-wider">Archetype</label>
                    <p className="text-lg font-semibold text-slate-100">{result.evaluation.archetype}</p>
                  </div>
                  <div className={`text-4xl font-bold ${
                    result.evaluation.score >= 4.2 ? 'text-emerald-400' :
                    result.evaluation.score >= 3.8 ? 'text-yellow-400' :
                    result.evaluation.score >= 3.0 ? 'text-slate-300' : 'text-red-400'
                  }`}>
                    {result.evaluation.score.toFixed(1)}
                    <span className="text-lg text-slate-500">/5</span>
                  </div>
                </div>
              )}

              {result.evaluation?.tldr && (
                <div>
                  <label className="text-xs font-medium text-sky-400 uppercase tracking-wider">TL;DR</label>
                  <p className="mt-1 text-slate-300">{result.evaluation.tldr}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {result.evaluation?.comp && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Compensation</label>
                    <p className="mt-0.5 text-yellow-400 font-medium">{result.evaluation.comp}</p>
                  </div>
                )}
                {result.evaluation?.remote && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Remote Policy</label>
                    <p className="mt-0.5 text-slate-300">{result.evaluation.remote}</p>
                  </div>
                )}
                {result.evaluation?.verdict && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Legitimacy</label>
                    <p className="mt-0.5 text-emerald-400">{result.evaluation.verdict}</p>
                  </div>
                )}
              </div>

              {result.evaluation?.blocks && Object.keys(result.evaluation.blocks).length > 0 && (
                <div className="pt-4 border-t border-[#2a2a38]">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 block">Detailed Analysis</label>
                  <div className="space-y-3">
                    {Object.entries(result.evaluation.blocks).slice(0, 6).map(([title, content]: [string, any]) => (
                      <details key={title} className="group">
                        <summary className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
                          <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                          {title}
                        </summary>
                        <div className="mt-2 ml-6 text-sm text-slate-400 whitespace-pre-wrap">
                          {typeof content === 'string' ? content.slice(0, 300) + (content.length > 300 ? '...' : '') : JSON.stringify(content)}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Save Evaluation Report" size="md">
        <div className="space-y-4">
          <Input
            label="Company Name"
            placeholder="Enter company name"
            value={company}
            onChange={setCompany}
          />
          <p className="text-sm text-slate-500">
            This will save the evaluation report to your career-ops reports folder and add the application to your tracker.
          </p>
          <div className="flex gap-2">
            <ActionButton variant="secondary" onClick={() => setSaveModalOpen(false)}>Cancel</ActionButton>
            <ActionButton onClick={saveReport} loading={saveStatus === 'loading'}>
              <Check className="w-4 h-4" />
              Save
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}