'use client';

import { useState, useEffect } from 'react';
import { usePipeline } from '@/lib/context';
import { Card, Input, ActionButton } from '@/components/ui/features';
import { Modal } from '@/components/ui/modal';
import { FileText, Plus, ExternalLink, RefreshCw, Brain } from 'lucide-react';

export function InterviewPanel() {
  const { careerOpsPath } = usePipeline();
  const [prepFiles, setPrepFiles] = useState<any[]>([]);
  const [storyBank, setStoryBank] = useState<any>({ stories: [] });
  const [loading, setLoading] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jdText, setJdText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedPrep, setSelectedPrep] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/interview-prep?path=${encodeURIComponent(careerOpsPath)}`);
      const data = await res.json();
      setPrepFiles(data.prepFiles || []);
      setStoryBank(data.storyBank || { stories: [] });
    } catch (e) {
      console.error('Failed to load interview prep');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (careerOpsPath) {
      loadData();
    }
  }, [careerOpsPath]);

  const generatePrep = async () => {
    if (!company) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, role, jdText, careerOpsPath })
      });

      const data = await res.json();
      if (data.success) {
        setGenerateModal(false);
        setCompany('');
        setRole('');
        setJdText('');
        loadData();
      }
    } catch (e) {
      console.error('Failed to generate interview prep');
    }
    setGenerating(false);
  };

  const viewPrep = async (file: any) => {
    try {
      const res = await fetch(`/api/interview-prep?path=${encodeURIComponent(careerOpsPath)}&company=${encodeURIComponent(file.name)}`);
      const data = await res.json();
      setSelectedPrep(data);
    } catch (e) {
      console.error('Failed to load prep file');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Interview Preparation" description="Company-specific interview intel and story bank">
          <div className="flex gap-3 mb-6">
            <ActionButton onClick={() => setGenerateModal(true)}>
              <Plus className="w-4 h-4" />
              Generate Prep
            </ActionButton>
            <ActionButton variant="secondary" onClick={loadData} loading={loading}>
              <RefreshCw className="w-4 h-4" />
            </ActionButton>
          </div>

          {prepFiles.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-medium text-slate-300 mb-3 block">Company Prep Files</label>
              <div className="grid gap-2">
                {prepFiles.map((file: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => viewPrep(file)}
                    className="flex items-center gap-3 p-4 bg-[#16161e] hover:bg-[#242430] border border-[#2a2a38] rounded-xl text-left transition-colors"
                  >
                    <FileText className="w-5 h-5 text-blue-400" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-200">{file.name.replace(/-/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{new Date(file.modified).toLocaleDateString()}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {storyBank.stories && storyBank.stories.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-300 mb-3 block">STAR+R Story Bank</label>
              <div className="grid gap-2">
                {storyBank.stories.map((story: any, i: number) => (
                  <details key={i} className="group">
                    <summary className="flex items-center gap-3 p-4 bg-[#16161e] border border-[#2a2a38] rounded-xl cursor-pointer hover:bg-[#242430] transition-colors">
                      <Brain className="w-5 h-5 text-purple-400" />
                      <span className="flex-1 text-slate-200">{story.title}</span>
                      <span className="text-xs text-slate-500">{story.content?.length || 0} chars</span>
                    </summary>
                    <div className="mt-2 p-4 bg-[#0f0f13] rounded-xl text-sm text-slate-400 whitespace-pre-wrap">
                      {story.content?.join('\n')}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {prepFiles.length === 0 && storyBank.stories.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-500">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No interview prep materials yet.</p>
              <p className="text-sm mt-1">Generate your first company prep above.</p>
            </div>
          )}
        </Card>
      </div>

      <Modal open={generateModal} onClose={() => setGenerateModal(false)} title="Generate Interview Prep" size="lg">
        <div className="space-y-4">
          <Input
            label="Company"
            placeholder="e.g., Google, Meta, Startup Name"
            value={company}
            onChange={setCompany}
          />
          <Input
            label="Role (optional)"
            placeholder="e.g., Senior Software Engineer"
            value={role}
            onChange={setRole}
          />
          <Input
            label="Job Description (optional)"
            placeholder="Paste JD for personalized prep..."
            value={jdText}
            onChange={setJdText}
            multiline
            rows={6}
          />
          <div className="flex gap-3">
            <ActionButton variant="secondary" onClick={() => setGenerateModal(false)}>Cancel</ActionButton>
            <ActionButton onClick={generatePrep} loading={generating} disabled={!company}>
              <Brain className="w-4 h-4" />
              Generate
            </ActionButton>
          </div>
        </div>
      </Modal>

      <Modal open={!!selectedPrep} onClose={() => setSelectedPrep(null)} title={selectedPrep?.company || 'Interview Prep'} size="xl">
        {selectedPrep && (
          <div className="prose prose-invert prose-slate max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-slate-300 bg-[#0f0f13] p-4 rounded-xl overflow-auto max-h-[60vh]">
              {selectedPrep.content}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}