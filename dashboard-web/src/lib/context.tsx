'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CareerApplication, PipelineMetrics, ReportSummary, ProgressMetrics, FilterMode, SortMode, ViewMode } from '@/types/pipeline';
import { normalizeStatus, computeProgressMetrics, computeMetrics, parseApplications, statusPriority } from '@/lib/data';

interface PipelineState {
  apps: CareerApplication[];
  filteredApps: CareerApplication[];
  metrics: PipelineMetrics | null;
  progressMetrics: ProgressMetrics | null;
  reportCache: Record<string, ReportSummary>;
  selectedIndex: number;
  filter: FilterMode;
  sort: SortMode;
  view: ViewMode;
  loading: boolean;
  error: string | null;
  careerOpsPath: string;
  previewApp: CareerApplication | null;
}

interface PipelineContextType extends PipelineState {
  setSelectedIndex: (index: number) => void;
  setFilter: (filter: FilterMode) => void;
  setSort: (sort: SortMode) => void;
  setView: (view: ViewMode) => void;
  updateStatus: (reportNumber: string, newStatus: string) => Promise<void>;
  openReport: (app: CareerApplication) => void;
  openJobURL: (url: string) => void;
  refresh: () => void;
  loadReportContent: (reportPath: string) => Promise<string | null>;
}

const PipelineContext = createContext<PipelineContextType | null>(null);

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error('usePipeline must be used within PipelineProvider');
  return ctx;
}

export function PipelineProvider({ children }: { children: React.ReactNode }) {
  const [apps, setApps] = useState<CareerApplication[]>([]);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics | null>(null);
  const [reportCache, setReportCache] = useState<Record<string, ReportSummary>>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilterState] = useState<FilterMode>('all');
  const [sort, setSortState] = useState<SortMode>('score');
  const [view, setViewState] = useState<ViewMode>('grouped');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [careerOpsPath, setCareerOpsPath] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applications?path=${encodeURIComponent(careerOpsPath)}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setApps([]);
        setMetrics(null);
        setReportCache({});
      } else {
        setApps(data.apps || []);
        setMetrics(data.metrics || null);
        setReportCache(data.reportCache || {});
        if (data.progressMetrics) {
          setProgressMetrics(data.progressMetrics);
        } else if (data.apps) {
          setProgressMetrics(computeProgressMetrics(data.apps));
        }
        if (data.careerOpsPath && !careerOpsPath) {
          setCareerOpsPath(data.careerOpsPath);
        }
      }
    } catch (e) {
      setError('Failed to load applications');
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [careerOpsPath]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredApps = React.useMemo(() => {
    let filtered = [...apps];

    // Filter
    if (filter === 'top') {
      filtered = filtered.filter(a => a.score >= 4.0 && normalizeStatus(a.status) !== 'skip');
    } else if (filter !== 'all') {
      filtered = filtered.filter(a => normalizeStatus(a.status) === filter);
    }

    // Sort
    const sorted = [...filtered];
    if (view === 'grouped') {
      sorted.sort((a, b) => {
        const priorityA = statusPriority(a.status);
        const priorityB = statusPriority(b.status);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return sortWithinGroup(a, b, sort);
      });
    } else {
      switch (sort) {
        case 'score':
          sorted.sort((a, b) => b.score - a.score);
          break;
        case 'date':
          sorted.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          break;
        case 'company':
          sorted.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
          break;
        case 'status':
          sorted.sort((a, b) => statusPriority(a.status) - statusPriority(b.status));
          break;
      }
    }

    return sorted;
  }, [apps, filter, sort, view]);

  const previewApp = selectedIndex >= 0 && selectedIndex < filteredApps.length
    ? filteredApps[selectedIndex]
    : null;

  const setFilter = useCallback((f: FilterMode) => {
    setFilterState(f);
    setSelectedIndex(0);
  }, []);

  const setSort = useCallback((s: SortMode) => {
    setSortState(s);
  }, []);

  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
  }, []);

  const updateStatus = useCallback(async (reportNumber: string, newStatus: string) => {
    await fetch('/api/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ careerOpsPath, reportNumber, newStatus }),
    });
    await loadData();
  }, [careerOpsPath, loadData]);

  const openReport = useCallback((app: CareerApplication) => {
    if (app.reportPath) {
      window.open(`/report?path=${encodeURIComponent(app.reportPath)}&careerOps=${encodeURIComponent(careerOpsPath)}`, '_blank');
    }
  }, [careerOpsPath]);

  const openJobURL = useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const loadReportContent = useCallback(async (reportPath: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(reportPath)}?path=${encodeURIComponent(careerOpsPath)}`);
      const data = await res.json();
      return data.content || null;
    } catch {
      return null;
    }
  }, [careerOpsPath]);

  return (
    <PipelineContext.Provider value={{
      apps,
      filteredApps,
      metrics,
      progressMetrics,
      reportCache,
      selectedIndex,
      setSelectedIndex,
      filter,
      setFilter,
      sort,
      setSort,
      view,
      setView,
      loading,
      error,
      careerOpsPath,
      previewApp,
      updateStatus,
      openReport,
      openJobURL,
      refresh,
      loadReportContent,
    }}>
      {children}
    </PipelineContext.Provider>
  );
}

function sortWithinGroup(a: CareerApplication, b: CareerApplication, sort: SortMode): number {
  switch (sort) {
    case 'score': return b.score - a.score;
    case 'date': return (b.date || '').localeCompare(a.date || '');
    case 'company': return (a.company || '').localeCompare(b.company || '');
    default: return b.score - a.score;
  }
}