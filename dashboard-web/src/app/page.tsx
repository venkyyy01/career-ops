'use client';

import { useState } from 'react';
import { PipelineProvider } from '@/lib/context';
import { Header } from '@/components/pipeline/header';
import { FilterTabs } from '@/components/pipeline/filter-tabs';
import { MetricsBar } from '@/components/pipeline/metrics-bar';
import { Toolbar } from '@/components/pipeline/toolbar';
import { ApplicationList } from '@/components/pipeline/application-list';
import { PreviewPanel } from '@/components/pipeline/preview-panel';
import { HelpFooter } from '@/components/pipeline/help-footer';
import { ProgressAnalytics } from '@/components/analytics/progress-analytics';
import { SankeyDiagram } from '@/components/analytics/sankey-diagram';
import { ReportViewer } from '@/components/pipeline/report-viewer';
import { LoadingSkeleton, ErrorState } from '@/components/ui/states';
import { FeatureNav } from '@/components/ui/features';
import { usePipeline } from '@/lib/context';
import { motion, AnimatePresence } from '@/lib/animate';

import { EvaluatePanel } from '@/components/features/evaluate-panel';
import { ScanPanel } from '@/components/features/scan-panel';
import { BatchPanel } from '@/components/features/batch-panel';
import { FollowupPanel } from '@/components/features/followup-panel';
import { PatternsPanel } from '@/components/features/patterns-panel';
import { InterviewPanel } from '@/components/features/interview-panel';
import { ApplyPanel } from '@/components/features/apply-panel';
import { DeepResearchPanel } from '@/components/features/deep-research-panel';
import { LayoutList, BarChart3 } from 'lucide-react';

type Feature = 'pipeline' | 'analytics' | 'evaluate' | 'scan' | 'batch' | 'followup' | 'patterns' | 'interview' | 'apply' | 'deep';

function DashboardContent() {
  const { loading, error, previewApp, careerOpsPath, refresh } = usePipeline();
  const [currentView, setCurrentView] = useState<Feature>('pipeline');
  const [reportViewerOpen, setReportViewerOpen] = useState(false);

  if (loading && currentView === 'pipeline') {
    return <LoadingSkeleton />;
  }

  if (error && currentView === 'pipeline') {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0f0f13]">
      <Header />

      <FeatureNav active={currentView} onChange={setCurrentView} />

      <AnimatePresence mode="wait">
        {currentView === 'pipeline' && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex overflow-hidden"
          >
            <div className="flex-1 flex flex-col">
              <MetricsBar />
              <Toolbar />
              <ApplicationList onOpenReport={() => setReportViewerOpen(true)} />
            </div>
            <PreviewPanel onOpenReport={() => setReportViewerOpen(true)} />
          </motion.div>
        )}

        {currentView === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto scrollbar-thin"
          >
            <div className="max-w-5xl mx-auto py-6 px-5 space-y-6">
              <SankeyDiagram />
              <ProgressAnalytics />
            </div>
          </motion.div>
        )}

        {currentView === 'evaluate' && (
          <motion.div
            key="evaluate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <EvaluatePanel />
          </motion.div>
        )}

        {currentView === 'scan' && (
          <motion.div
            key="scan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <ScanPanel />
          </motion.div>
        )}

        {currentView === 'batch' && (
          <motion.div
            key="batch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <BatchPanel />
          </motion.div>
        )}

        {currentView === 'followup' && (
          <motion.div
            key="followup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <FollowupPanel />
          </motion.div>
        )}

        {currentView === 'patterns' && (
          <motion.div
            key="patterns"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <PatternsPanel />
          </motion.div>
        )}

        {currentView === 'interview' && (
          <motion.div
            key="interview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <InterviewPanel />
          </motion.div>
        )}

        {currentView === 'apply' && (
          <motion.div
            key="apply"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <ApplyPanel />
          </motion.div>
        )}

        {currentView === 'deep' && (
          <motion.div
            key="deep"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <DeepResearchPanel />
          </motion.div>
        )}
      </AnimatePresence>

      <ReportViewer
        reportPath={reportViewerOpen && previewApp ? previewApp.reportPath : null}
        title={previewApp ? `${previewApp.company} — ${previewApp.role}` : ''}
        careerOpsPath={careerOpsPath}
        onClose={() => setReportViewerOpen(false)}
      />

      <HelpFooter />
    </div>
  );
}

export default function Home() {
  return (
    <PipelineProvider>
      <DashboardContent />
    </PipelineProvider>
  );
}