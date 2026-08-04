import React from 'react';
import { estimateCpfLifePayout } from '../engine/cpfLife';
import type { CpfPlan } from '../types';
import styles from './PlanComparison.module.css';

interface Props {
  raAtPayoutStart: number;
  selectedPlan: CpfPlan;
  payoutStartAge: number;
  planHorizon: number;
  inflAdj: boolean;
  inflAtPayout: number;
}

const PLAN_META: Record<CpfPlan, { badge: string; color: string; growth: string; desc: string; bequestNote: string }> = {
  Standard: {
    badge: 'Level',
    color: 'var(--teal)',
    growth: 'Fixed monthly amount',
    desc: 'Consistent payout for life. Most predictable retirement income. Ideal if you want certainty.',
    bequestNote: 'Standard pool',
  },
  Escalating: {
    badge: '+2% per year',
    color: 'var(--blue)',
    growth: '+2%/yr from year 2',
    desc: 'Starts ~12% lower than Standard but grows 2% annually — beats Standard after ~10 years. Best inflation hedge.',
    bequestNote: 'Standard pool',
  },
  Basic: {
    badge: 'Higher early',
    color: 'var(--amber)',
    growth: 'Level (may reduce later)',
    desc: 'Higher initial payout while RA pool is healthy. Potentially larger bequest. Payout may reduce in later years.',
    bequestNote: 'Potentially higher',
  },
};

function calcTotal(pm: number, plan: CpfPlan, years: number): number {
  if (plan === 'Escalating') {
    let s = 0, p = pm;
    for (let y = 0; y < years; y++) { s += p * 12; p = Math.round(p * 1.02); }
    return s;
  }
  return pm * 12 * years;
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(n / 1000)}k`;
}

export default function PlanComparison({
  raAtPayoutStart, selectedPlan, payoutStartAge, planHorizon,
  inflAdj, inflAtPayout,
}: Props) {
  const years = planHorizon - payoutStartAge;
  const plans: CpfPlan[] = ['Standard', 'Escalating', 'Basic'];

  return (
    <div className={styles.grid}>
      {plans.map(plan => {
        // Single source of truth: call the same engine function used for the KPI cards.
        // No more independent reimplementation of the payout formula in the UI layer.
        const pmNominal = estimateCpfLifePayout(raAtPayoutStart, plan, payoutStartAge);
        const pmDisplay = Math.round(inflAdj ? pmNominal / inflAtPayout : pmNominal);
        const totalNominal = calcTotal(pmNominal, plan, years);
        const totalDisplay = inflAdj ? totalNominal / inflAtPayout : totalNominal;
        const meta = PLAN_META[plan];
        const isSel = plan === selectedPlan;

        return (
          <div key={plan} className={`${styles.card} ${isSel ? styles.cardSel : ''}`}>
            {isSel && <div className={styles.selBadge}>Your selection</div>}
            <div className={styles.planName}>{plan}</div>
            <div className={styles.badge} style={{ background: `${meta.color}18`, color: meta.color }}>
              {meta.badge}
            </div>
            <div className={styles.payout}>${pmDisplay.toLocaleString('en-SG')}</div>
            <div className={styles.payoutSub}>
              per month from age {payoutStartAge}
              {inflAdj && <span style={{ color: 'var(--slate-400)', fontSize: '9px' }}> · today's $</span>}
            </div>

            <div className={styles.rows}>
              <div className={styles.row}>
                <span>To age {planHorizon}</span>
                <strong>{fmtK(totalDisplay)}</strong>
              </div>
              <div className={styles.row}>
                <span>Growth</span>
                <strong>{meta.growth}</strong>
              </div>
              <div className={styles.row}>
                <span>Bequest</span>
                <strong>{meta.bequestNote}</strong>
              </div>
            </div>
            <p className={styles.desc}>{meta.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
