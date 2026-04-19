'use client';

import { useState, useEffect } from 'react';
import { usePipeline } from '@/lib/context';
import { Card, ActionButton, StatusBadge } from '@/components/ui/features';
import { Brain, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function PatternsPanel() {
  const { careerOpsPath } = usePipeline();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patterns?path=${encodeURIComponent(careerOpsPath)}`);
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) {
      console.error('Failed to load analysis');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (careerOpsPath) {
      loadAnalysis();
    }
  }, [careerOpsPath]);

  const regenerate = async () => {
    setLoading(true);
    try {
      await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', careerOpsPath })
      });
      await loadAnalysis();
    } catch (e) {
      console.error('Failed to regenerate analysis');
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Rejection Pattern Analysis" description="Identify patterns in your application outcomes">
          <div className="flex gap-3 mb-6">
            <ActionButton onClick={loadAnalysis} loading={loading}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </ActionButton>
            <ActionButton variant="secondary" onClick={regenerate}>
              <Brain className="w-4 h-4" />
              Regenerate
            </ActionButton>
          </div>

          {analysis && (
            <div className="space-y-6">
              {analysis.summary && (
                <div className="p-4 bg-blue-400/10 border border-blue-400/20 rounded-xl">
                  <label className="text-xs font-medium text-blue-400 uppercase tracking-wider">Summary</label>
                  <p className="mt-1 text-slate-300">{analysis.summary}</p>
                </div>
              )}

              {analysis.funnelAnalysis && Object.keys(analysis.funnelAnalysis).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-3 block">Conversion Funnel</label>
                  <div className="space-y-2">
                    {Object.entries(analysis.funnelAnalysis).map(([stage, data]: [string, any]) => (
                      <div key={stage} className="flex items-center gap-4">
                        <span className="w-24 text-sm text-slate-400 capitalize">{stage}</span>
                        <div className="flex-1 h-6 bg-[#242430] rounded overflow-hidden">
                          <div
                            className="h-full bg-blue-400"
                            style={{ width: `${typeof data === 'string' ? parseFloat(data) || 0 : data.count || 0}%` }}
                          />
                        </div>
                        <span className="w-16 text-sm text-slate-300 text-right">
                          {typeof data === 'string' ? data : data.count || data}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.archetypePerformance && analysis.archetypePerformance.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-3 block">Archetype Performance</label>
                  <div className="space-y-2">
                    {analysis.archetypePerformance.map((item: any, i: number) => {
                      const parts = typeof item === 'string' ? item.split('|').map(s => s.trim()) : [item];
                      return (
                        <div key={i} className="flex items-center gap-4 p-3 bg-[#16161e] rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="flex-1 text-slate-300">{parts[0]}</span>
                          <span className="text-sm text-slate-500">{parts[1] || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {analysis.topBlockers && analysis.topBlockers.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-3 block">Top Blockers</label>
                  <div className="space-y-2">
                    {analysis.topBlockers.map((blocker: any, i: number) => {
                      const text = typeof blocker === 'string' ? blocker : blocker.text || blocker;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                          <span className="text-slate-300">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-3 block">Recommendations</label>
                  <div className="space-y-2">
                    {analysis.recommendations.map((rec: any, i: number) => {
                      const text = typeof rec === 'string' ? rec : rec.text || rec;
                      const impact = typeof rec === 'object' ? rec.impact : 'medium';
                      const impactColors = {
                        high: 'text-red-400',
                        medium: 'text-yellow-400',
                        low: 'text-emerald-400'
                      };
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-[#16161e] rounded-lg">
                          <TrendingUp className={`w-4 h-4 ${impactColors[impact as keyof typeof impactColors] || 'text-slate-400'} mt-0.5`} />
                          <span className="text-slate-300 flex-1">{text}</span>
                          <span className={`text-xs uppercase ${impactColors[impact as keyof typeof impactColors] || 'text-slate-400'}`}>
                            {impact}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!analysis && !loading && (
            <div className="text-center py-12 text-slate-500">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Not enough data to analyze patterns.</p>
              <p className="text-sm mt-1">Add more applications to see pattern analysis.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}