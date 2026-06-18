import React, { useState } from 'react';
import { KpiCard, Toggle } from './Primitives';
import BalanceChart from './BalanceChart';
import PlanComparison from './PlanComparison';
import DeferralTab from './DeferralTab';
import RetirementSumTab from './RetirementSumTab';
import YearTable from './YearTable';
import type { SimSummary, FormState } from '../types';
import styles from './Dashboard.module.css';

interface Props {
  summary: SimSummary;
  form: FormState;
}

type TabId = 'plans' | 'deferral' | 'retirement' | 'table';

const TABS: { id: TabId; label: string }[] = [
  { id: 'plans', label: 'CPF LIFE plans' },
  { id: 'deferral', label: 'Deferral analysis' },
  { id: 'retirement', label: 'Retirement sum' },
  { id: 'table', label: 'Year by year' },
];

function fmt(n: number, infl: number, adj: boolean): string {
  const v = adj ? n / infl : n;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return '$' + Math.round(v).toLocaleString('en-SG');
}

function fmtMo(n: number, infl: number, adj: boolean): string {
  return fmt(n, infl, adj) + '/mo';
}

export default function Dashboard({ summary, form }: Props) {
  const [inflAdj, setInflAdj] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('plans');

  const { annual, totalAt55, raAtPayoutStart, monthlyPayout, lifetimePayouts,
    inflAt55, inflAtPayout, inflFinal } = summary;

  const age55Row = annual.find(r => r.is55Event) ?? annual.find(r => r.isPost55);
  const payoutRow = annual.find(r => r.isPayout);
  const age55Year = age55Row?.year ?? null;
  const payoutStartYear = payoutRow?.year ?? null;

  const currentAge = (() => {
    const d = new Date(form.dob + 'T00:00:00Z');
    const now = new Date();
    let a = now.getUTCFullYear() - d.getUTCFullYear();
    if ((now.getUTCMonth() + 1) * 100 + now.getUTCDate() < (d.getUTCMonth() + 1) * 100 + d.getUTCDate()) a--;
    return a;
  })();

  return (
    <div className={styles.dashboard}>
      {/* Header row */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Your CPF Forecast</h1>
          <p className={styles.sub}>
            Age {currentAge} today · {form.rsTarget} target · {form.cpfPlan} CPF LIFE ·
            to age {form.planHorizon}
          </p>
        </div>
        <Toggle checked={inflAdj} onChange={setInflAdj} label="Inflation-adjusted" />
      </div>

      {/* KPI cards */}
      <div className={styles.kpiGrid}>
        <KpiCard
          label="Total CPF at 55"
          value={fmt(totalAt55, inflAt55, inflAdj)}
          sub={inflAdj ? "in today's dollars" : "OA + SA + MA at age 55"}
        />
        <KpiCard
          label={`RA at age ${form.payoutStartAge}`}
          value={fmt(raAtPayoutStart, inflAtPayout, inflAdj)}
          sub={`Funds your ${form.cpfPlan} CPF LIFE annuity`}
        />
        <KpiCard
          label="Monthly CPF LIFE"
          value={fmtMo(monthlyPayout, inflAtPayout, inflAdj)}
          sub={`${form.cpfPlan} plan · from age ${form.payoutStartAge}`}
          highlight
        />
        <KpiCard
          label={`Lifetime payouts to ${form.planHorizon}`}
          value={fmt(lifetimePayouts, inflFinal, inflAdj)}
          sub={`Ages ${form.payoutStartAge}–${form.planHorizon}`}
        />
      </div>

      {/* Balance chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <div className={styles.chartTitle}>CPF balance trajectory</div>
            <div className={styles.chartSub}>
              All accounts · accumulation through CPF LIFE payout phase ·{' '}
              {inflAdj ? 'inflation-adjusted (today\'s dollars)' : 'nominal dollars'}
            </div>
          </div>
          <div className={styles.legend}>
            {[['#378ADD', 'OA'], ['#1D9E75', 'SA → RA'], ['#BA7517', 'MA']].map(([c, l]) => (
              <span key={l} className={styles.legItem}>
                <span className={styles.legSwatch} style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.chartArea}>
          <BalanceChart
            rows={annual}
            inflAdj={inflAdj}
            age55Year={age55Year}
            payoutStartYear={payoutStartYear}
          />
        </div>
        <div className={styles.milestones}>
          <span className={styles.msItem}>
            <span className={styles.msLine} style={{ borderColor: 'rgba(226,75,74,0.8)' }} />
            Age 55 — SA closes, RA created
          </span>
          <span className={styles.msItem}>
            <span className={styles.msLine} style={{ borderColor: 'rgba(239,159,39,0.8)' }} />
            CPF LIFE starts
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabOn : ''}`}
            onClick={() => setActiveTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.tabBody}>
        {activeTab === 'plans' && (
          <PlanComparison
            raAtPayoutStart={raAtPayoutStart}
            selectedPlan={form.cpfPlan}
            payoutStartAge={form.payoutStartAge}
            planHorizon={form.planHorizon}
            basePayout={monthlyPayout}
          />
        )}
        {activeTab === 'deferral' && (
          <DeferralTab
            raAtPayoutStart={raAtPayoutStart}
            plan={form.cpfPlan}
            selectedAge={form.payoutStartAge}
            planHorizon={form.planHorizon}
          />
        )}
        {activeTab === 'retirement' && (
          <RetirementSumTab summary={summary} />
        )}
        {activeTab === 'table' && (
          <YearTable rows={annual} inflAdj={inflAdj} />
        )}
      </div>

      {/* Disclaimer */}
      <div className={styles.disclaimer}>
        Estimates only · Based on CPF rules effective 1 Jan 2026 · CPF LIFE payouts are indicative,
        calibrated against CPF Board's published estimator examples · Interest rates, retirement sums
        and BHS may change · Not financial advice ·{' '}
        <a href="https://www.cpf.gov.sg" target="_blank" rel="noopener noreferrer">
          CPF Board official site →
        </a>
      </div>
    </div>
  );
}
