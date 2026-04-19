'use client';

export function LoadingSkeleton() {
  return (
    <div className="h-[100dvh] flex flex-col bg-[#0f0f13]">
      <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a21] border-b border-[#2a2a38]">
        <div className="flex items-center gap-4">
          <div className="h-7 w-32 bg-[#242430] rounded animate-pulse" />
          <div className="h-4 w-24 bg-[#242430] rounded animate-pulse" />
        </div>
        <div className="h-8 w-8 bg-[#242430] rounded-lg animate-pulse" />
      </div>

      <div className="flex items-center gap-1 px-5 py-2 bg-[#1a1a21] border-b border-[#2a2a38]">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 bg-[#242430] rounded-lg animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-4 px-5 py-2 bg-[#16161e] border-b border-[#2a2a38]">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-4 w-16 bg-[#242430] rounded animate-pulse"
            style={{ animationDelay: `${i * 30}ms` }}
          />
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4">
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-3 bg-[#1a1a21] rounded-lg animate-pulse"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="h-5 w-10 bg-[#242430] rounded" />
                <div className="h-4 w-20 bg-[#242430] rounded" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-[#242430] rounded mb-1" />
                  <div className="h-3 w-48 bg-[#242430] rounded" />
                </div>
                <div className="h-4 w-24 bg-[#242430] rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="w-96 border-l border-[#2a2a38] p-4">
          <div className="bg-[#16161e] rounded-xl p-4 animate-pulse">
            <div className="h-6 w-32 bg-[#242430] rounded mb-2" />
            <div className="h-4 w-48 bg-[#242430] rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-[#242430] rounded" />
              <div className="h-4 w-3/4 bg-[#242430] rounded" />
              <div className="h-4 w-5/6 bg-[#242430] rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ message = 'No offers match this filter' }: { message?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-500">
      <div className="text-center max-w-sm">
        <div className="relative mx-auto mb-6">
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            className="text-slate-700"
          >
            <rect
              x="10"
              y="20"
              width="60"
              height="45"
              rx="4"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M10 30L40 50L70 30"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="30" cy="38" r="4" fill="currentColor" opacity="0.3" />
            <circle cx="50" cy="38" r="4" fill="currentColor" opacity="0.3" />
          </svg>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#1a1a21] border border-[#2a2a38] rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
        </div>
        <p className="text-base font-medium text-slate-400 mb-2">{message}</p>
        <p className="text-sm text-slate-600">
          Try adjusting your filters or add new applications.
        </p>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="h-[100dvh] flex items-center justify-center bg-[#0f0f13]">
      <div className="text-center max-w-md">
        <div className="relative mx-auto mb-6">
          <svg
            width="100"
            height="100"
            viewBox="0 0 100 100"
            fill="none"
            className="text-red-900"
          >
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
            <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.7" />
            <path
              d="M50 25L50 55M50 65L50 75"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-200 mb-2">Unable to Load</h2>
        <p className="text-slate-400 mb-6">{message}</p>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Make sure your career-ops directory has an <code className="px-1.5 py-0.5 bg-[#1a1a21] rounded text-slate-300">applications.md</code> file.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}