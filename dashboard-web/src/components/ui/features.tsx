'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutList,
  BarChart3,
  Search,
  FileText,
  Play,
  Mail,
  Brain,
  Send,
  Sparkles,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Plus,
  X
} from 'lucide-react';

type Feature = 'pipeline' | 'analytics' | 'evaluate' | 'scan' | 'batch' | 'followup' | 'patterns' | 'interview' | 'apply' | 'deep';

const FEATURES: { id: Feature; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'pipeline', label: 'Pipeline', icon: <LayoutList className="w-5 h-5" />, description: 'View and manage applications' },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, description: 'Funnel charts and metrics' },
  { id: 'evaluate', label: 'Evaluate', icon: <Sparkles className="w-5 h-5" />, description: 'A-F job evaluation' },
  { id: 'scan', label: 'Scan', icon: <Search className="w-5 h-5" />, description: 'Discover new jobs' },
  { id: 'batch', label: 'Batch', icon: <Play className="w-5 h-5" />, description: 'Process multiple jobs' },
  { id: 'followup', label: 'Follow-up', icon: <Mail className="w-5 h-5" />, description: 'Track outreach cadence' },
  { id: 'patterns', label: 'Patterns', icon: <Brain className="w-5 h-5" />, description: 'Rejection analysis' },
  { id: 'interview', label: 'Interview', icon: <FileText className="w-5 h-5" />, description: 'Prep materials' },
  { id: 'apply', label: 'Apply', icon: <Send className="w-5 h-5" />, description: 'Form assistant' },
  { id: 'deep', label: 'Deep Research', icon: <ChevronRight className="w-5 h-5" />, description: 'Company intel' },
];

interface FeatureNavProps {
  active: Feature;
  onChange: (feature: Feature) => void;
}

export function FeatureNav({ active, onChange }: FeatureNavProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a21] border-b border-[#2a2a38]">
      <div className="flex items-center gap-1">
        {FEATURES.slice(0, 4).map(feature => (
          <button
            key={feature.id}
            onClick={() => onChange(feature.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active === feature.id
                ? 'bg-blue-400/20 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#242430]'
            }`}
          >
            {feature.icon}
            <span className="hidden lg:inline">{feature.label}</span>
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-[#2a2a38]" />

      <div className="flex items-center gap-1">
        {FEATURES.slice(4).map(feature => (
          <button
            key={feature.id}
            onClick={() => onChange(feature.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active === feature.id
                ? 'bg-blue-400/20 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#242430]'
            }`}
          >
            {feature.icon}
            <span className="hidden xl:inline">{feature.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

export function StatusBadge({ status, message }: StatusBadgeProps) {
  const config = {
    idle: { bg: 'bg-[#242430]', text: 'text-slate-500', icon: null },
    loading: { bg: 'bg-blue-400/20', text: 'text-blue-400', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    success: { bg: 'bg-emerald-400/20', text: 'text-emerald-400', icon: <CheckCircle2 className="w-3 h-3" /> },
    error: { bg: 'bg-red-400/20', text: 'text-red-400', icon: <AlertCircle className="w-3 h-3" /> },
  };

  const { bg, text, icon } = config[status];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {icon}
      {message && <span>{message}</span>}
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function ActionButton({
  onClick,
  loading,
  disabled,
  variant = 'primary',
  size = 'md',
  children,
  icon
}: ActionButtonProps) {
  const variants = {
    primary: 'bg-blue-400 hover:bg-blue-500 text-white',
    secondary: 'bg-[#242430] hover:bg-[#2a2a38] text-slate-200',
    ghost: 'bg-transparent hover:bg-[#242430] text-slate-400 hover:text-slate-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

interface CardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Card({ title, description, children, actions, className = '' }: CardProps) {
  return (
    <div className={`bg-[#1a1a21] border border-[#2a2a38] rounded-2xl overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-[#2a2a38]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
          {actions}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  multiline,
  rows = 4,
  error,
  hint
}: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-4 py-3 bg-[#16161e] border border-[#2a2a38] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/20 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-[#16161e] border border-[#2a2a38] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/20"
        />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}