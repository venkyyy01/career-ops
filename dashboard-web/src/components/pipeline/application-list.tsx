'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePipeline } from '@/lib/context';
import { normalizeStatus, getScoreColor, formatStatus, getStatusColor } from '@/lib/data';
import { ExternalLink, FileText, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/states';

const STATUS_ORDER = ['interview', 'offer', 'responded', 'applied', 'evaluated', 'skip', 'rejected', 'discarded'];

interface ApplicationListProps {
  onOpenReport?: () => void;
}

export function ApplicationList({ onOpenReport }: ApplicationListProps) {
  const {
    filteredApps,
    selectedIndex,
    setSelectedIndex,
    view,
    reportCache,
    openJobURL,
  } = usePipeline();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'j':
        e.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, filteredApps.length - 1));
        break;
      case 'ArrowUp':
      case 'k':
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
        break;
      case 'Enter':
      case 'o':
        if (filteredApps[selectedIndex]?.reportPath && onOpenReport) {
          onOpenReport();
        }
        break;
      case 'u':
        if (filteredApps[selectedIndex]?.jobURL) {
          openJobURL(filteredApps[selectedIndex].jobURL);
        }
        break;
      case 'g':
        setSelectedIndex(0);
        break;
      case 'G':
        setSelectedIndex(filteredApps.length - 1);
        break;
    }
  }, [selectedIndex, filteredApps, setSelectedIndex, openJobURL, onOpenReport]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const groupedApps = useMemo(() => {
    if (view !== 'grouped') return null;

    const groups: { status: string; apps: typeof filteredApps }[] = [];
    let currentGroup: { status: string; apps: typeof filteredApps } | null = null;

    for (const app of filteredApps) {
      const norm = normalizeStatus(app.status);
      if (!currentGroup || currentGroup.status !== norm) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { status: norm, apps: [app] };
      } else {
        currentGroup.apps.push(app);
      }
    }
    if (currentGroup) groups.push(currentGroup);

    return groups;
  }, [filteredApps, view]);

  if (filteredApps.length === 0) {
    return <EmptyState />;
  }

  if (view === 'flat') {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredApps.map((app, i) => (
          <AppRow
            key={`${app.reportPath}-${i}`}
            app={app}
            selected={i === selectedIndex}
            onClick={() => setSelectedIndex(i)}
            reportCache={reportCache}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {groupedApps?.map(group => (
        <div key={group.status}>
          <div className="sticky top-0 z-10 px-5 py-1.5 bg-[#16161e] border-y border-[#2a2a38]">
            <span className={`text-xs font-semibold uppercase tracking-wider ${getStatusColor(group.status)}`}>
              {formatStatus(group.status)}
            </span>
            <span className="ml-2 text-xs text-slate-500">({group.apps.length})</span>
          </div>
          {group.apps.map((app, i) => {
            const globalIndex = filteredApps.indexOf(app);
            return (
              <AppRow
                key={`${app.reportPath}-${globalIndex}`}
                app={app}
                selected={globalIndex === selectedIndex}
                onClick={() => setSelectedIndex(globalIndex)}
                reportCache={reportCache}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface AppRowProps {
  app: {
    number: number;
    date: string;
    company: string;
    role: string;
    score: number;
    status: string;
    reportPath: string;
    jobURL: string;
    hasPDF: boolean;
  };
  selected: boolean;
  onClick: () => void;
  reportCache: Record<string, { archetype: string; tldr: string; remote: string; comp: string }>;
}

function AppRow({ app, selected, onClick, reportCache }: AppRowProps) {
  const summary = app.reportPath ? reportCache[app.reportPath] : null;

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`group flex items-center gap-4 px-5 py-3 cursor-pointer border-b border-[#2a2a38]/50 transition-colors ${
        selected
          ? 'bg-blue-400/10 border-l-2 border-l-blue-400'
          : 'hover:bg-[#1a1a21]/80'
      }`}
    >
      <div className={`w-12 text-sm font-mono ${app.score > 0 ? getScoreColor(app.score) : 'text-slate-600'}`}>
        {app.score > 0 ? app.score.toFixed(1) : '—'}
      </div>

      <div className="w-20 text-xs text-slate-500 font-mono">
        {app.date || '—'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-200 truncate">{app.company}</span>
          {app.hasPDF && <span className="text-emerald-400 text-xs">PDF</span>}
        </div>
        <div className="text-sm text-slate-500 truncate">{app.role}</div>
      </div>

      <div className="w-24 text-xs text-slate-500 truncate">
        {summary?.comp || summary?.tldr || ''}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {app.jobURL && (
          <button
            onClick={(e) => { e.stopPropagation(); window.open(app.jobURL, '_blank'); }}
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-[#242430] rounded"
            title="Open job URL"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
        {app.reportPath && (
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`/report?path=${encodeURIComponent(app.reportPath)}`, '_blank'); }}
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-[#242430] rounded"
            title="View report"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-slate-600" />
      </div>
    </motion.div>
  );
}