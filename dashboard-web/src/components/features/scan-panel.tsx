'use client';

import { useState, useEffect } from 'react';
import { usePipeline } from '@/lib/context';
import { Card, Input, ActionButton, StatusBadge } from '@/components/ui/features';
import { Search, Plus, RefreshCw, ExternalLink } from 'lucide-react';

export function ScanPanel() {
  const { careerOpsPath } = usePipeline();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<any>(null);
  const [portals, setPortals] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [mode, setMode] = useState<'quick' | 'full'>('quick');

  useEffect(() => {
    loadPortals();
  }, [careerOpsPath]);

  const loadPortals = async () => {
    try {
      const res = await fetch(`/api/scan?path=${encodeURIComponent(careerOpsPath)}`);
      const data = await res.json();
      setPortals(data.portals || []);
    } catch (e) {
      console.error('Failed to load portals');
    }
  };

  const runScan = async () => {
    setStatus('loading');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, careerOpsPath })
      });

      const data = await res.json();
      setResults(data);
      setStatus(data.success ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const addToPipeline = async () => {
    if (!newUrl) return;

    try {
      await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          jobUrls: [newUrl],
          careerOpsPath
        })
      });

      setNewUrl('');
      runScan();
    } catch (e) {
      console.error('Failed to add URL');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Job Portal Scanner" description="Discover new job postings across configured portals">
          <div className="space-y-4">
            <div className="flex gap-2">
          <select
            aria-label="Scan mode"
            value={mode}
            onChange={e => setMode(e.target.value as 'quick' | 'full')}
            className="px-4 py-2 bg-[#16161e] border border-[#2a2a38] rounded-xl text-slate-200"
          >
                <option value="quick">Quick Scan</option>
                <option value="full">Full Scan</option>
              </select>

              <ActionButton onClick={runScan} loading={status === 'loading'}>
                <Search className="w-4 h-4" />
                Scan Portals
              </ActionButton>

              <ActionButton variant="secondary" onClick={loadPortals}>
                <RefreshCw className="w-4 h-4" />
              </ActionButton>
            </div>

            {status === 'success' && results && (
              <div className="p-4 bg-emerald-400/10 border border-emerald-400/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-400 font-medium">Scan Complete</p>
                    <p className="text-sm text-slate-400">{results.summary}</p>
                  </div>
                  <div className="text-3xl font-bold text-emerald-400">{results.jobsFound}</div>
                </div>
              </div>
            )}

            {results?.newJobs && results.newJobs.length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-medium text-slate-300 mb-2 block">New Jobs Found</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.newJobs.map((job: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#16161e] rounded-lg">
                      <span className="text-sm text-slate-300 truncate flex-1">{job.url}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-500 hover:text-slate-200"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Add to Pipeline" description="Manually add job URLs to process later">
          <div className="space-y-4">
            <Input
              placeholder="https://careers.company.com/jobs/123"
              value={newUrl}
              onChange={setNewUrl}
            />
            <ActionButton onClick={addToPipeline} disabled={!newUrl}>
              <Plus className="w-4 h-4" />
              Add URL
            </ActionButton>
          </div>
        </Card>

        {portals.length > 0 && (
          <Card title="Configured Portals" description={`${portals.length} portals being tracked`}>
            <div className="space-y-2">
              {portals.map((portal: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#16161e] rounded-lg">
                  <div>
                    <p className="font-medium text-slate-200">{portal.name || 'Unnamed'}</p>
                    {portal.url && <p className="text-xs text-slate-500 truncate max-w-md">{portal.url}</p>}
                  </div>
                  <StatusBadge status="idle" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}