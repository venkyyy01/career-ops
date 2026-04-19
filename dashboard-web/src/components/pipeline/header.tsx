'use client';

import { usePipeline } from '@/lib/context';
import { RefreshCw, BarChart3, Settings } from 'lucide-react';

export function Header() {
  const { metrics, loading, refresh } = usePipeline();

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-[#1a1a21] border-b border-[#2a2a38]">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-blue-400">Career</span>
          <span className="text-slate-100">Pipeline</span>
        </h1>

        {!loading && metrics && (
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {metrics.total} apps
            </span>
            <span className="text-slate-600">|</span>
            <span>Avg {metrics.avgScore.toFixed(1)}/5</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={refresh}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#242430] rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
}