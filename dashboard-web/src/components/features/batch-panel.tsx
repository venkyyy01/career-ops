'use client';

import { useState, useEffect } from 'react';
import { usePipeline } from '@/lib/context';
import { Card, ActionButton, StatusBadge } from '@/components/ui/features';
import { Play, Pause, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function BatchPanel() {
  const { careerOpsPath } = usePipeline();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/batch?path=${encodeURIComponent(careerOpsPath)}`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error('Failed to load batch status');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (careerOpsPath) {
      loadStatus();
    }
  }, [careerOpsPath]);

  const runBatch = async () => {
    setLoading(true);
    try {
      await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process', careerOpsPath })
      });
      await loadStatus();
    } catch (e) {
      console.error('Failed to run batch');
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Batch Processing" description="Process multiple job applications in parallel">
          <div className="space-y-6">
            {status && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-[#16161e] rounded-xl">
                    <div className="text-3xl font-bold text-slate-100">{status.total || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Total</div>
                  </div>
                  <div className="text-center p-4 bg-[#16161e] rounded-xl">
                    <div className="text-3xl font-bold text-emerald-400">{status.completed || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Completed</div>
                  </div>
                  <div className="text-center p-4 bg-[#16161e] rounded-xl">
                    <div className="text-3xl font-bold text-yellow-400">{status.processing || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Processing</div>
                  </div>
                  <div className="text-center p-4 bg-[#16161e] rounded-xl">
                    <div className="text-3xl font-bold text-red-400">{status.failed || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Failed</div>
                  </div>
                </div>

                {status.total > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-slate-200">{status.progress}%</span>
                    </div>
                    <div
                      className="h-2 bg-[#242430] rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={status.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Batch progress"
                    >
                      <div
                        className="h-full bg-blue-400 transition-all"
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <ActionButton onClick={runBatch} loading={loading} variant="primary">
                <Play className="w-4 h-4" />
                Start Processing
              </ActionButton>
              <ActionButton variant="secondary" onClick={loadStatus}>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </ActionButton>
            </div>

            {status?.pending && status.pending.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-300 mb-3 block">
                  Pending Jobs ({status.pending.length})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {status.pending.map((job: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[#16161e] rounded-lg">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-300 truncate flex-1">{job.url}</span>
                      <span className="text-xs text-slate-500">{job.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Batch Status Legend">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Completed - Report generated</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-300">Processing - Currently being evaluated</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-slate-300">Failed - Error occurred</span>
            </div>
            <div className="flex items-center gap-2">
              <Pause className="w-4 h-4 text-slate-500" />
              <span className="text-slate-300">Pending - Waiting to be processed</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
