'use client';

import { usePipeline } from '@/lib/context';
import { FILTER_TABS } from '@/types/pipeline';
import { normalizeStatus } from '@/lib/data';
import { motion } from 'framer-motion';

export function FilterTabs() {
  const { apps, filter, setFilter } = usePipeline();

  const countForFilter = (f: string) => {
    if (f === 'all') return apps.length;
    if (f === 'top') return apps.filter(a => a.score >= 4.0).length;
    return apps.filter(a => normalizeStatus(a.status) === f).length;
  };

  return (
    <div className="flex items-center gap-1 px-5 py-2 bg-[#1a1a21] border-b border-[#2a2a38] overflow-x-auto scrollbar-thin">
      {FILTER_TABS.map(tab => {
        const count = countForFilter(tab.filter);
        const active = filter === tab.filter;

        return (
          <button
            key={tab.filter}
            onClick={() => setFilter(tab.filter)}
            className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              active
                ? 'text-blue-400 bg-blue-400/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#242430]'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${active ? 'text-blue-400/70' : 'text-slate-500'}`}>
              {count}
            </span>
            {active && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 border border-blue-400/30 rounded-lg -z-10"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}