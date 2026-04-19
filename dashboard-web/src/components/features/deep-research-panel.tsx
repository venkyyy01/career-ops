'use client';

import { useState } from 'react';
import { usePipeline } from '@/lib/context';
import { Card, Input, ActionButton, StatusBadge } from '@/components/ui/features';
import { ChevronRight, Brain, Search, ExternalLink } from 'lucide-react';

export function DeepResearchPanel() {
  const { careerOpsPath } = usePipeline();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [research, setResearch] = useState<any>(null);
  const [error, setError] = useState('');

  const runResearch = async () => {
    if (!company) return;

    setStatus('loading');
    setError('');
    setResearch(null);

    try {
      const res = await fetch('/api/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, role, careerOpsPath })
      });

      const data = await res.json();

      if (data.error) {
        setStatus('error');
        setError(data.error);
      } else {
        setStatus('success');
        setResearch(data.research);
      }
    } catch (e) {
      setStatus('error');
      setError('Failed to conduct research');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Deep Company Research" description="Comprehensive intel on any company">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Company Name"
                placeholder="e.g., Google, OpenAI, Series A Startup"
                value={company}
                onChange={setCompany}
              />
              <Input
                label="Target Role (optional)"
                placeholder="e.g., Senior ML Engineer"
                value={role}
                onChange={setRole}
              />
            </div>

            <ActionButton onClick={runResearch} loading={status === 'loading'} disabled={!company}>
              <Brain className="w-4 h-4" />
              Research {company}
            </ActionButton>

            {status === 'error' && <StatusBadge status="error" message={error} />}
          </div>
        </Card>

        {research && (
          <>
            <Card title="AI Strategy & Products">
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap">{research.summary || 'No data available'}</p>
              </div>
            </Card>

            <Card title="Engineering Culture">
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap">{research.culture || 'No data available'}</p>
              </div>
            </Card>

            <Card title="Probable Challenges">
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap">{research.challenges || 'No data available'}</p>
              </div>
            </Card>

            <Card title="Competitive Landscape">
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap">{research.competitive || 'No data available'}</p>
              </div>
            </Card>

            <Card title="Candidate Value Proposition">
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap">{research.valueProp || 'No data available'}</p>
              </div>
            </Card>

            <Card title="Interview Preparation">
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap">{research.interviewPrep || 'No data available'}</p>
              </div>
            </Card>

            {research.sections && Object.keys(research.sections).length > 0 && (
              <Card title="Full Research Report" actions={
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(company + ' careers')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              }>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(research.sections).map(([title, content]: [string, any]) => (
                    <details key={title} className="group">
                      <summary className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
                        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                        {title}
                      </summary>
                      <div className="mt-2 ml-6 text-sm text-slate-400 whitespace-pre-wrap">
                        {typeof content === 'string' ? content : JSON.stringify(content)}
                      </div>
                    </details>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {!research && status === 'idle' && (
          <Card title="Research Topics Covered">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                'AI Strategy & Products',
                'Recent Company Movements',
                'Engineering Culture',
                'Technical Challenges',
                'Competitive Landscape',
                'Candidate Value Prop',
                'Interview Topics',
                'Questions to Ask'
              ].map((topic, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-[#16161e] rounded-lg">
                  <Search className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">{topic}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}