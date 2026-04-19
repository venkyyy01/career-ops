'use client';

import { usePipeline } from '@/lib/context';
import { SORT_OPTIONS } from '@/types/pipeline';
import { Select } from '@/components/ui/select';
import { ArrowUpDown, LayoutGrid, List, Keyboard } from 'lucide-react';

export function Toolbar() {
  const { filteredApps, sort, setSort, view, setView } = usePipeline();

  return (
    <div className="flex items-center justify-between px-5 py-2 bg-[#1a1a21] border-b border-[#2a2a38]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Sort:</span>
        </div>

        <Select
          value={sort}
          onChange={(v) => setSort(v as typeof sort)}
          options={SORT_OPTIONS.map(o => ({ value: o.mode, label: o.label }))}
          className="w-28"
        />

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setView('grouped')}
            className={`p-1.5 rounded-md transition-colors ${
              view === 'grouped'
                ? 'bg-blue-400/20 text-blue-400'
                : 'text-slate-500 hover:text-slate-300 hover:bg-[#242430]'
            }`}
            title="Grouped view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('flat')}
            className={`p-1.5 rounded-md transition-colors ${
              view === 'flat'
                ? 'bg-blue-400/20 text-blue-400'
                : 'text-slate-500 hover:text-slate-300 hover:bg-[#242430]'
            }`}
            title="Flat view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400">
          {filteredApps.length} shown
        </span>

        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#16161e] rounded-md border border-[#2a2a38]">
          <Keyboard className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-500">?</span>
        </div>
      </div>
    </div>
  );
}