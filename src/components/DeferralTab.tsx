import React, { useRef, useEffect } from 'react';
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, type ChartConfiguration } from 'chart.js';
import type { CpfPlan } from '../types';
import styles from './DeferralTab.module.css';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

interface Props {
  raAtPayoutStart: number;
  plan: CpfPlan;
  selectedAge: number;
  planHorizon: number;
}

const PLAN_RATIO: Record<CpfPlan, number> = { Standard: 1, Escalating: 0.88, Basic: 1.08 };

function calcPayout(ra: number, plan: CpfPlan, age: number): number {
  const factor = 8.08 * Math.pow(1.065, age - 65) * PLAN_RATIO[plan];
  return Math.round((ra / 1000) * factor);
}

function calcCumulative(pm: number, plan: CpfPlan, startAge: number, currentAge: number): number {
  if (currentAge < startAge) return 0;
  const months = (currentAge - startAge) * 12;
  let cum = 0;
  for (let m = 0; m < months; m++) {
    const esc = plan === 'Escalating' ? Math.pow(1.02, Math.floor(m / 12)) : 1;
    cum += pm * esc;
  }
  return Math.round(cum);
}

export default function DeferralTab({ raAtPayoutStart, plan, selectedAge, planHorizon }: Props) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const ages = [65, 66, 67, 68, 69, 70];

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current?.destroy();

    const endAge = Math.min(planHorizon, 95);
    const ageRange = Array.from({ length: endAge - 63 }, (_, i) => 65 + i);
    const colors = ['#378ADD', '#1D9E75', '#BA7517'];

    const datasets = [65, 67, 70].map((startAge, i) => {
      const pm = calcPayout(raAtPayoutStart, plan, startAge);
      return {
        label: `Start age ${startAge}`,
        data: ageRange.map(a => calcCumulative(pm, plan, startAge, a)),
        borderColor: colors[i],
        borderWidth: 2,
        borderDash: i > 0 ? [5, 3] : [],
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      };
    });

    const config: ChartConfiguration = {
      type: 'line',
      data: { labels: ageRange.map(String), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: i => `Age ${i[0].label}`,
              label: i => `$${Math.round(i.raw as number).toLocaleString('en-SG')} cumul. — ${i.dataset.label}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
          y: {
            border: { display: false },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              font: { size: 10 },
              callback: v => {
                const n = Number(v);
                return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}k`;
              },
            },
          },
        },
      },
    };

    chartInstance.current = new Chart(chartRef.current, config);
    return () => { chartInstance.current?.destroy(); chartInstance.current = null; };
  }, [raAtPayoutStart, plan, planHorizon]);

  return (
    <div>
      <p className={styles.subtitle}>
        Monthly payout by start age · <strong>{plan}</strong> plan · same RA balance (${raAtPayoutStart.toLocaleString('en-SG')})
      </p>
      <div className={styles.deferCards}>
        {ages.map(age => {
          const pm = calcPayout(raAtPayoutStart, plan, age);
          const bonus = age > 65 ? `+${Math.round((Math.pow(1.065, age - 65) - 1) * 100)}%` : 'Base';
          const isSelected = age === selectedAge;
          return (
            <div key={age} className={`${styles.dCard} ${isSelected ? styles.dCardSel : ''}`}>
              <div className={styles.dAge}>Age {age}</div>
              <div className={styles.dPm}>${pm.toLocaleString('en-SG')}</div>
              <div className={styles.dBonus}>{bonus}</div>
              <div className={styles.dSub}>/month</div>
            </div>
          );
        })}
      </div>
      <div className={styles.chartWrap}>
        <p className={styles.chartLabel}>Cumulative payouts over time — start age 65 vs 67 vs 70</p>
        <div style={{ position: 'relative', height: 180 }}>
          <canvas ref={chartRef} />
        </div>
        <div className={styles.legend}>
          {[['#378ADD', 'Start age 65'], ['#1D9E75', 'Start age 67 (dashed)'], ['#BA7517', 'Start age 70 (dashed)']].map(([c, l]) => (
            <span key={l} className={styles.legItem}>
              <span className={styles.legSwatch} style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
