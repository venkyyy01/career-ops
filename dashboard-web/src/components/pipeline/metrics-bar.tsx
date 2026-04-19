'use client';

import { usePipeline } from '@/lib/context';
import { getStatusColor } from '@/lib/data';

const STATUS_ORDER = ['interview', 'offer', 'responded', 'applied', 'evaluated', 'skip', 'rejected', 'discarded'];

const STATUS_LABELS: Record<string, string> = {
  interview: 'Interview',
  offer: 'Offer',
  responded: 'Responded',
  applied: 'Applied',
  evaluated: 'Evaluated',
  skip: 'Skip',
  rejected: 'Rejected',
  discarded: 'Discarded',
};

export function MetricsBar() {
  const { metrics } = usePipeline();

  if (!metrics) return null;

  return (
    <div className="flex items-center gap-4 px-5 py-2 bg-[#16161e] border-b border-[#2a2a38] text-xs">
      {STATUS_ORDER.map(status => {
        const count = metrics.byStatus[status] || 0;
        if (count === 0) return null;

        return (
          <span key={status} className={`flex items-center gap-1.5 ${getStatusColor(status)}`}>
            <span className="font-medium">{STATUS_LABELS[status]}</span>
            <span className="text-slate-500">:</span>
            <span>{count}</span>
          </span>
        );
      })}

      <span className="ml-auto text-slate-500">
        {metrics.actionable} actionable
      </span>
    </div>
  );
}