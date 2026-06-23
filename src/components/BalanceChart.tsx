import React, { useRef, useEffect } from 'react';
import {
  Chart,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
  type ChartConfiguration,
  type Plugin,
} from 'chart.js';
import type { AnnualRow } from '../types';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Props {
  rows: AnnualRow[];
  inflAdj: boolean;
  age55Year: number | null;
  payoutStartYear: number | null;
}

export default function BalanceChart({ rows, inflAdj, age55Year, payoutStartYear }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const sample = rows.length > 50
      ? rows.filter((_, i) => i % Math.ceil(rows.length / 50) === 0 || i === rows.length - 1)
      : rows;

    const adj = (r: AnnualRow) => inflAdj ? r.inflFactor : 1;
    const labels = sample.map(r => String(r.age));
    const oaData = sample.map(r => Math.round(r.oa / adj(r)));
    const saData = sample.map(r => Math.round(r.saOrRa / adj(r)));
    const maData = sample.map(r => Math.round(r.ma / adj(r)));

    const age55Idx = age55Year ? sample.findIndex(r => r.isPost55) : -1;
    const payoutIdx = payoutStartYear ? sample.findIndex(r => r.isPayout) : -1;

    const milestonePlugin: Plugin = {
      id: 'milestones',
      afterDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        const lines: [number, string][] = [
          [age55Idx, 'rgba(226,75,74,0.8)'],
          [payoutIdx, 'rgba(239,159,39,0.8)'],
        ];
        lines.forEach(([idx, color]) => {
          if (idx < 0) return;
          const xPos = x.getPixelForValue(idx);
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(xPos, y.top);
          ctx.lineTo(xPos, y.bottom);
          ctx.stroke();
          ctx.restore();
        });
      },
    };

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ordinary (OA)',
            data: oaData,
            backgroundColor: 'rgba(55,138,221,0.78)',
            stack: 's',
            borderWidth: 0,
            borderRadius: 0,
          },
          {
            label: 'Special / Retirement (SA→RA)',
            data: saData,
            backgroundColor: 'rgba(29,158,117,0.78)',
            stack: 's',
            borderWidth: 0,
            borderRadius: 0,
          },
          {
            label: 'MediSave (MA)',
            data: maData,
            backgroundColor: 'rgba(186,117,23,0.72)',
            stack: 's',
            borderWidth: 0,
            borderRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            callbacks: {
              title: items => `Age ${items[0].label}`,
              label: item => `$${Math.round(item.raw as number).toLocaleString('en-SG')}  ${item.dataset.label}`,
              footer: items => `Total: $${items.reduce((s, i) => s + (i.raw as number), 0).toLocaleString('en-SG')}`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 10, family: 'Inter' }, maxTicksLimit: 14, maxRotation: 0 },
          },
          y: {
            stacked: true,
            border: { display: false },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              font: { size: 10, family: 'Inter' },
              callback: v => {
                const n = Number(v);
                if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
                if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
                return `$${n}`;
              },
            },
          },
        },
      },
      plugins: [milestonePlugin],
    };

    chartRef.current = new Chart(canvasRef.current, config);
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [rows, inflAdj, age55Year, payoutStartYear]);

  return <canvas ref={canvasRef} role="img" aria-label="Stacked bar chart of CPF account balances by age" />;
}
