'use client';

import { useState, useEffect } from 'react';
import { usePipeline } from '@/lib/context';
import { Card, Input, ActionButton, StatusBadge } from '@/components/ui/features';
import { Send, FileText, CheckCircle2, RefreshCw } from 'lucide-react';

export function ApplyPanel() {
  const { careerOpsPath } = usePipeline();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formUrl, setFormUrl] = useState('');
  const [formAnalysis, setFormAnalysis] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/apply?path=${encodeURIComponent(careerOpsPath)}`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error('Failed to load apply status');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (careerOpsPath) {
      loadStatus();
    }
  }, [careerOpsPath]);

  const analyzeForm = async () => {
    if (!formUrl) return;

    setLoading(true);
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze-form',
          data: { formUrl },
          careerOpsPath
        })
      });

      const data = await res.json();
      if (data.success) {
        setFormAnalysis(data);
      }
    } catch (e) {
      console.error('Failed to analyze form');
    }
    setLoading(false);
  };

  const generateAnswers = async () => {
    if (!formAnalysis) return;

    setLoading(true);
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-answers',
          data: {
            formFields: formAnalysis.fields,
            jobInfo: {}
          },
          careerOpsPath
        })
      });

      const data = await res.json();
      if (data.success) {
        setAnswers(data.answers);
      }
    } catch (e) {
      console.error('Failed to generate answers');
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Apply Assistant" description="Form analysis and answer generation for job applications">
          <div className="space-y-4">
            <Input
              label="Job Application URL"
              placeholder="Paste the application form URL"
              value={formUrl}
              onChange={setFormUrl}
              hint="Note: Form analysis works best with the direct form URL"
            />

            <div className="flex gap-3">
              <ActionButton onClick={analyzeForm} loading={loading} disabled={!formUrl}>
                <FileText className="w-4 h-4" />
                Analyze Form
              </ActionButton>
            </div>
          </div>
        </Card>

        {formAnalysis && (
          <Card title="Form Analysis" description={`Found ${formAnalysis.fields.length} form fields`}>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-[#16161e] rounded-xl">
                  <div className="text-2xl font-bold text-slate-100">{formAnalysis.summary?.total || 0}</div>
                  <div className="text-xs text-slate-500">Total Fields</div>
                </div>
                <div className="text-center p-3 bg-[#16161e] rounded-xl">
                  <div className="text-2xl font-bold text-blue-400">{formAnalysis.summary?.text || 0}</div>
                  <div className="text-xs text-slate-500">Text Fields</div>
                </div>
                <div className="text-center p-3 bg-[#16161e] rounded-xl">
                  <div className="text-2xl font-bold text-purple-400">{formAnalysis.summary?.textarea || 0}</div>
                  <div className="text-xs text-slate-500">Text Areas</div>
                </div>
                <div className="text-center p-3 bg-[#16161e] rounded-xl">
                  <div className="text-2xl font-bold text-yellow-400">{formAnalysis.summary?.select || 0}</div>
                  <div className="text-xs text-slate-500">Dropdowns</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Categorized Fields</label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(formAnalysis.categorized || {}).map(([category, fields]: [string, any]) => (
                    fields.length > 0 && (
                      <div key={category} className="p-3 bg-[#16161e] rounded-xl">
                        <label className="text-xs font-medium text-slate-500 uppercase">{category}</label>
                        <div className="mt-2 space-y-1">
                          {fields.map((field: any, i: number) => (
                            <div key={i} className="text-sm text-slate-300">
                              {field.name}
                              {field.placeholder && <span className="text-slate-500 ml-2">({field.placeholder})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              <ActionButton onClick={generateAnswers} loading={loading}>
                <Send className="w-4 h-4" />
                Generate Answers
              </ActionButton>
            </div>
          </Card>
        )}

        {answers.length > 0 && (
          <Card title="Generated Answers" description="Review and copy your personalized answers">
            <div className="space-y-3">
              {answers.map((answer: any, i: number) => (
                <div key={i} className="p-4 bg-[#16161e] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">{answer.name}</label>
                    <span className="text-xs text-slate-500 uppercase">{answer.type}</span>
                  </div>
                  <p className="text-sm text-slate-400 bg-[#0f0f13] p-3 rounded-lg">
                    {answer.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {status && (
          <Card title="Quick Status">
            <div className="flex items-center gap-4">
              <StatusBadge
                status={status.hasCV ? 'success' : 'error'}
                message={status.hasCV ? 'CV loaded' : 'No CV found'}
              />
              <span className="text-sm text-slate-500">
                CV length: {status.cvLength || 0} chars
              </span>
              <span className="text-sm text-slate-500">
                Recent reports: {status.recentReports?.length || 0}
              </span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}