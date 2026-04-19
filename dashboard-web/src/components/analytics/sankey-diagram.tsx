'use client';

import { usePipeline } from '@/lib/context';
import { motion } from 'framer-motion';
import { normalizeStatus } from '@/lib/data';

interface SankeyNode {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export function SankeyDiagram() {
  const { apps } = usePipeline();

  const counts = {
    evaluated: apps.length,
    applied: apps.filter(a => ['applied', 'responded', 'interview', 'offer', 'rejected'].includes(normalizeStatus(a.status))).length,
    responded: apps.filter(a => ['responded', 'interview', 'offer'].includes(normalizeStatus(a.status))).length,
    interview: apps.filter(a => ['interview', 'offer'].includes(normalizeStatus(a.status))).length,
    offer: apps.filter(a => normalizeStatus(a.status) === 'offer').length,
  };

  const nodes: SankeyNode[] = [
    { id: 'evaluated', label: 'Evaluated', value: counts.evaluated, color: '#38bdf8' },
    { id: 'applied', label: 'Applied', value: counts.applied, color: '#818cf8' },
    { id: 'responded', label: 'Responded', value: counts.responded, color: '#a78bfa' },
    { id: 'interview', label: 'Interview', value: counts.interview, color: '#c084fc' },
    { id: 'offer', label: 'Offer', value: counts.offer, color: '#34d399' },
  ];

  const links: SankeyLink[] = [
    { source: 'evaluated', target: 'applied', value: counts.applied },
    { source: 'applied', target: 'responded', value: counts.responded },
    { source: 'responded', target: 'interview', value: counts.interview },
    { source: 'interview', target: 'offer', value: counts.offer },
  ];

  const maxValue = Math.max(...nodes.map(n => n.value), 1);
  const nodeHeight = 48;
  const nodeGap = 24;
  const columnWidth = 180;
  const labelWidth = 100;

  return (
    <div className="bg-[#1a1a21] border border-[#2a2a38] rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-2">Pipeline Flow</h3>
      <p className="text-sm text-slate-500 mb-6">From evaluation to offer</p>

      <div className="relative overflow-x-auto">
        <svg
          width={labelWidth + columnWidth * nodes.length + 100}
          height={nodeHeight * 2 + nodeGap * 2 + 60}
          className="overflow-visible"
        >
          <defs>
            {links.map((link, i) => {
              const sourceNode = nodes.find(n => n.id === link.source);
              const targetNode = nodes.find(n => n.id === link.target);
              if (!sourceNode || !targetNode) return null;

              const sourceX = labelWidth + nodes.indexOf(sourceNode) * columnWidth + columnWidth;
              const targetX = labelWidth + nodes.indexOf(targetNode) * columnWidth;
              const sourceY = nodeHeight + nodeGap;
              const targetY = nodeHeight + nodeGap;

              const midX = (sourceX + targetX) / 2;

              return (
                <linearGradient
                  key={`grad-${i}`}
                  id={`grad-${i}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor={sourceNode.color} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={targetNode.color} stopOpacity="0.6" />
                </linearGradient>
              );
            })}
          </defs>

          {nodes.map((node, i) => {
            const x = labelWidth + i * columnWidth;
            const nodeWidth = Math.max((node.value / maxValue) * (columnWidth - 40), 60);
            const y = nodeHeight + nodeGap;
            const actualWidth = columnWidth - 20;

            return (
              <g key={node.id}>
                <motion.rect
                  x={x}
                  y={y}
                  width={actualWidth}
                  height={nodeHeight}
                  rx={8}
                  fill={node.color}
                  opacity={0.9}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 0.9, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                />

                <text
                  x={x + actualWidth / 2}
                  y={y + nodeHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={14}
                  fontWeight={600}
                >
                  {node.value}
                </text>

                <motion.text
                  x={x + actualWidth / 2}
                  y={y + nodeHeight + 16}
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize={12}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                >
                  {node.label}
                </motion.text>
              </g>
            );
          })}

          {links.map((link, i) => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            if (!sourceNode || !targetNode) return null;

            const sourceIdx = nodes.indexOf(sourceNode);
            const targetIdx = nodes.indexOf(targetNode);

            const sourceX = labelWidth + sourceIdx * columnWidth + columnWidth - 10;
            const targetX = labelWidth + targetIdx * columnWidth + 10;
            const y = nodeHeight + nodeGap + nodeHeight / 2;

            const sourceWidth = columnWidth - 20;
            const targetWidth = columnWidth - 20;

            const midX = (sourceX + targetX) / 2;

            const path = `M ${sourceX} ${y - 15} Q ${midX} ${y - 40}, ${targetX} ${y - 15}`;
            const path2 = `M ${sourceX} ${y + 15} Q ${midX} ${y + 40}, ${targetX} ${y + 15}`;

            return (
              <g key={`link-${i}`}>
                <motion.path
                  d={path}
                  fill="none"
                  stroke={`url(#grad-${i})`}
                  strokeWidth={2}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: i * 0.15 }}
                />
                <motion.path
                  d={path2}
                  fill="none"
                  stroke={`url(#grad-${i})`}
                  strokeWidth={2}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: i * 0.15 + 0.1 }}
                />

                <text
                  x={(sourceX + targetX) / 2}
                  y={y + 45}
                  textAnchor="middle"
                  fill="#52525b"
                  fontSize={10}
                >
                  {link.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-6 pt-6 border-t border-[#2a2a38] flex items-center justify-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sky-400" />
          <span className="text-xs text-slate-500">Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-xs text-slate-500">High</span>
        </div>
      </div>
    </div>
  );
}