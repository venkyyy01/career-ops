'use client';

import { usePipeline } from '@/lib/context';
import { motion } from 'framer-motion';

export function ProgressAnalytics() {
  const { progressMetrics, apps } = usePipeline();

  if (!progressMetrics) {
    return <ProgressSkeleton />;
  }

  const { funnelStages, scoreBuckets, responseRate, interviewRate, offerRate, avgScore, topScore, totalOffers, activeApps } = progressMetrics;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-8">
      <FunnelChart stages={funnelStages} totalOffers={totalOffers} activeApps={activeApps} total={apps.length} />
      <ScoreDistribution buckets={scoreBuckets} />
      <StatsGrid responseRate={responseRate} interviewRate={interviewRate} offerRate={offerRate} avgScore={avgScore} topScore={topScore} totalOffers={totalOffers} activeApps={activeApps} />
    </div>
  );
}

interface FunnelStage {
  label: string;
  count: number;
  pct: number;
}

function FunnelChart({ stages, totalOffers, activeApps, total }: { stages: FunnelStage[]; totalOffers: number; activeApps: number; total: number }) {
  const maxCount = stages[0]?.count || 1;
  const colors = ['bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-emerald-500'];

  return (
    <div className="bg-[#1a1a21] border border-[#2a2a38] rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-6">Application Funnel</h3>

      <div className="relative">
        {stages.map((stage, i) => {
          const width = (stage.count / maxCount) * 100;
          const isLast = i === stages.length - 1;

          return (
            <div key={stage.label} className="relative mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-300">{stage.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-100">{stage.count}</span>
                  <span className="text-xs text-slate-500 w-12 text-right">{stage.pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-8 bg-[#242430] rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full ${colors[i]} relative`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                </motion.div>
              </div>
              {!isLast && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-[#2a2a38] grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">{totalOffers}</div>
          <div className="text-xs text-slate-500 mt-1">Offers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{activeApps}</div>
          <div className="text-xs text-slate-500 mt-1">Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-300">{total}</div>
          <div className="text-xs text-slate-500 mt-1">Total</div>
        </div>
      </div>
    </div>
  );
}

interface ScoreBucket {
  label: string;
  count: number;
}

function ScoreDistribution({ buckets }: { buckets: ScoreBucket[] }) {
  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div className="bg-[#1a1a21] border border-[#2a2a38] rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-6">Score Distribution</h3>

      <div className="space-y-3">
        {buckets.map((bucket, i) => {
          const width = (bucket.count / maxCount) * 100;
          const colors = ['text-emerald-400', 'text-emerald-400/80', 'text-yellow-400', 'text-slate-400', 'text-red-400/80'];

          return (
            <div key={bucket.label} className="flex items-center gap-4">
              <div className="w-16 text-xs text-slate-400 font-mono">{bucket.label}</div>
              <div className="flex-1 h-6 bg-[#242430] rounded overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full ${colors[i]} opacity-80`}
                />
              </div>
              <div className="w-8 text-xs text-slate-500 text-right">{bucket.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StatsGridProps {
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  avgScore: number;
  topScore: number;
  totalOffers: number;
  activeApps: number;
}

function StatsGrid({ responseRate, interviewRate, offerRate, avgScore, topScore, totalOffers, activeApps }: StatsGridProps) {
  const stats = [
    { label: 'Response Rate', value: `${responseRate.toFixed(1)}%`, sublabel: 'of applied', color: 'text-blue-400' },
    { label: 'Interview Rate', value: `${interviewRate.toFixed(1)}%`, sublabel: 'of applied', color: 'text-purple-400' },
    { label: 'Offer Rate', value: `${offerRate.toFixed(1)}%`, sublabel: 'of applied', color: 'text-emerald-400' },
    { label: 'Avg Score', value: avgScore.toFixed(2), sublabel: 'out of 5.0', color: 'text-sky-400' },
    { label: 'Top Score', value: topScore.toFixed(1), sublabel: 'highest rated', color: 'text-yellow-400' },
    { label: 'Offers', value: String(totalOffers), sublabel: 'received', color: 'text-emerald-400' },
  ];

  return (
    <div className="bg-[#1a1a21] border border-[#2a2a38] rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-6">Key Metrics</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 bg-[#242430] rounded-xl"
          >
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm font-medium text-slate-300 mt-1">{stat.label}</div>
            <div className="text-xs text-slate-500">{stat.sublabel}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-8">
      <div className="bg-[#1a1a21] border border-[#2a2a38] rounded-2xl p-6 animate-pulse">
        <div className="h-6 w-32 bg-[#242430] rounded mb-6" />
        <div className="space-y-4">
          {[100, 75, 50, 35, 20].map((w, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1.5">
                <div className="h-4 w-20 bg-[#242430] rounded" />
                <div className="h-4 w-16 bg-[#242430] rounded" />
              </div>
              <div className="h-8 bg-[#242430] rounded-lg" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}