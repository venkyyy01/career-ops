export interface CareerApplication {
  number: number;
  date: string;
  company: string;
  role: string;
  score: number;
  scoreRaw: string;
  status: string;
  hasPDF: boolean;
  reportNumber: string;
  reportPath: string;
  notes: string;
  jobURL: string;
}

export interface PipelineMetrics {
  total: number;
  avgScore: number;
  topScore: number;
  withPDF: number;
  actionable: number;
  byStatus: Record<string, number>;
}

export interface ReportSummary {
  archetype: string;
  tldr: string;
  remote: string;
  comp: string;
}

export interface ProgressMetrics {
  totalOffers: number;
  activeApps: number;
  avgScore: number;
  topScore: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  funnelStages: FunnelStage[];
  scoreBuckets: ScoreBucket[];
  weeklyActivity: WeekActivity[];
}

export interface FunnelStage {
  label: string;
  count: number;
  pct: number;
}

export interface ScoreBucket {
  label: string;
  count: number;
}

export interface WeekActivity {
  week: string;
  count: number;
}

export type SortMode = 'score' | 'date' | 'company' | 'status';
export type FilterMode = 'all' | 'evaluated' | 'applied' | 'responded' | 'interview' | 'offer' | 'rejected' | 'skip' | 'top';
export type ViewMode = 'grouped' | 'flat';

export const STATUS_OPTIONS = [
  'Evaluated',
  'Applied',
  'Responded',
  'Interview',
  'Offer',
  'Rejected',
  'Discarded',
  'SKIP'
] as const;

export type StatusOption = typeof STATUS_OPTIONS[number];

export const FILTER_TABS: { filter: FilterMode; label: string }[] = [
  { filter: 'all', label: 'All' },
  { filter: 'evaluated', label: 'Evaluated' },
  { filter: 'applied', label: 'Applied' },
  { filter: 'responded', label: 'Responded' },
  { filter: 'interview', label: 'Interview' },
  { filter: 'offer', label: 'Offer' },
  { filter: 'rejected', label: 'Rejected' },
  { filter: 'skip', label: 'Skip' },
  { filter: 'top', label: 'Top ≥4' },
];

export const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'score', label: 'Score' },
  { mode: 'date', label: 'Date' },
  { mode: 'company', label: 'Company' },
  { mode: 'status', label: 'Status' },
];