import React, { useState } from 'react';
import { KpiCard, Toggle } from './Primitives';
import BalanceChart from './BalanceChart';
import PlanComparison from './PlanComparison';
import DeferralTab from './DeferralTab';
import RetirementSumTab from './RetirementSumTab';
import YearTable from './YearTable';
import LifeEventsTab from './LifeEventsTab';
import type { SimSummary, FormState } from '../types';
import styles from './Dashboard.module.css';

interface Props {
  summary: SimSummary;
  form: FormState;
}

type TabId = 'plans' | 'deferral' | 'retirement' | 'events' | 'table';

const TABS: { id: TabId; label: string }[] = [
  { id: 'plans',      label: 'CPF LIFE plans' },
  { id: 'deferral',   label: 'Deferral analysis' },
  { id: 'retirement', label: 'Retirement sum' },
  { id: 'events',     label: 'Life events' },
  { id: 'table',      label: 'Year by year' },
];

function fmt(n: number, infl: number, adj: boolean): string {
  const v = adj ? n / infl : n;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return '$' + Math.round(v).toLocaleString('en-SG');
}
function fmtMo(n: number, infl: number, adj: boolean): string {
  return fmt(n, infl, adj) + '/mo';
}
function fmtK(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return '$' + Math.round(n / 1_000) + 'k';
  return '$' + Math.round(n).toLocaleString('en-SG');
}

export default function Dashboard({ summary, form }: Props) {
  const [inflAdj, setInflAdj] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('plans');

  const {
    annual, totalAt55, totalWithCpfisAt55, cpfisAt55, cpfisEquivalentOaAt55,
    raAtPayoutStart, monthlyPayout, lifetimePayouts,
    inflAt55, inflAtPayout, inflFinal,
  } = summary;

  const showCpfis = form.cpfisEnabled && cpfisAt55 > 0;

  const age55Row      = annual.find(r => r.is55Event) ?? annual.find(r => r.isPost55);
  const payoutRow     = annual.find(r => r.isPayout);
  const age55Year     = age55Row?.year ?? null;
  const payoutStartYear = payoutRow?.year ?? null;

  const currentAge = (() => {
    const d = new Date(form.dob + 'T00:00:00Z');
    const now = new Date();
    let a = now.getUTCFullYear() - d.getUTCFullYear();
    if ((now.getUTCMonth() + 1) * 100 + now.getUTCDate() <
        (d.getUTCMonth() + 1) * 100 + d.getUTCDate()) a--;
    return a;
  })();

  const cpfisGain     = cpfisAt55 - form.cpfisBalance - (form.cpfisMonthlyContrib * 12 * Math.max(0, form.cpfisStopAge - currentAge));
  const cpfisBeatOa   = cpfisAt55 > cpfisEquivalentOaAt55;

  // Legend items for chart
  const legendItems: [string, string][] = [
    ['#378ADD', 'OA'],
    ['#1D9E75', 'SA → RA'],
    ['#BA7517', 'MA'],
  ];
  if (showCpfis) legendItems.push(['#8B5CF6', 'CPFIS']);

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Your CPF Forecast</h1>
          <p className={styles.sub}>
            Age {currentAge} today · {form.rsTarget} target · {form.cpfPlan} CPF LIFE · to age {form.planHorizon}
          </p>
        </div>
        <Toggle checked={inflAdj} onChange={setInflAdj} label="Inflation-adjusted" />
      </div>

      {/* KPI cards — show CPFIS combined total if enabled */}
      <div className={styles.kpiGrid}>
        <KpiCard
          label={showCpfis ? 'Total CPF + CPFIS at 55' : 'Total CPF at 55'}
          value={fmt(showCpfis ? totalWithCpfisAt55 : totalAt55, inflAt55, inflAdj)}
          sub={showCpfis
            ? `CPF ${fmtK(totalAt55)} + CPFIS ${fmtK(cpfisAt55)}`
            : inflAdj ? "in today's dollars" : 'OA + SA + MA at age 55'}
        />
        <KpiCard
          label={`RA at age ${form.payoutStartAge}`}
          value={fmt(raAtPayoutStart, inflAtPayout, inflAdj)}
          sub={`Funds your ${form.cpfPlan} CPF LIFE annuity`}
        />
        <KpiCard
          label="Monthly CPF LIFE ~est."
          value={fmtMo(monthlyPayout, inflAtPayout, inflAdj)}
          sub={`${form.cpfPlan} plan · from age ${form.payoutStartAge} · approximation`}
          highlight
        />
        <KpiCard
          label="Lifetime payouts ~est."
          value={fmt(lifetimePayouts, inflFinal, inflAdj)}
          sub={`Ages ${form.payoutStartAge}–${form.planHorizon} · approximation`}
        />
      </div>

      {/* CPFIS summary banner — shown only when CPFIS is active */}
      {showCpfis && (
        <div className={styles.cpfisBanner}>
          <div className={styles.cpfisBannerLeft}>
            <span className={styles.cpfisIcon}>◈</span>
            <div>
              <div className={styles.cpfisBannerTitle}>CPFIS projection at age {form.cpfisStopAge}</div>
              <div className={styles.cpfisBannerSub}>
                Investing ${form.cpfisMonthlyContrib.toLocaleString()}/mo at {form.cpfisAnnualReturn > 0 ? '+' : ''}{form.cpfisAnnualReturn}%/yr · returns compound annually
              </div>
            </div>
          </div>
          <div className={styles.cpfisBannerStats}>
            <div className={styles.cpfisStat}>
              <span className={styles.cpfisStatLabel}>Projected value</span>
              <span className={styles.cpfisStatVal}>{fmtK(cpfisAt55)}</span>
            </div>
            <div className={styles.cpfisStat}>
              <span className={styles.cpfisStatLabel}>OA equivalent (2.5%)</span>
              <span className={styles.cpfisStatVal} style={{ color: cpfisBeatOa ? 'var(--teal)' : '#B45309' }}>
                {fmtK(cpfisEquivalentOaAt55)}
                <span className={styles.cpfisStatBadge} style={{
                  background: cpfisBeatOa ? 'var(--teal-light)' : '#FFFBEB',
                  color: cpfisBeatOa ? 'var(--teal-deep)' : '#92400E',
                }}>
                  {cpfisBeatOa ? `+${fmtK(cpfisAt55 - cpfisEquivalentOaAt55)} vs OA` : `−${fmtK(cpfisEquivalentOaAt55 - cpfisAt55)} vs OA`}
                </span>
              </span>
            </div>
          </div>
          <div className={styles.cpfisBannerWarning}>
            ⚠ Returns not guaranteed · Fees not included · Market risk applies
          </div>
        </div>
      )}

      <p className={styles.estimateNote}>
        <strong>Total CPF</strong> and <strong>RA balance</strong> figures use CPF Board's official
        published contribution, allocation, and interest rates — exact, not estimates.
        <strong> CPF LIFE payout</strong> figures are approximations calibrated against CPF Board's
        published examples.{' '}
        {showCpfis && <><strong>CPFIS figures</strong> are user-input projections — not guaranteed. </>}
        <a href="https://www.cpf.gov.sg" target="_blank" rel="noopener noreferrer">CPF Board →</a>
      </p>

      {/* Balance chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <div className={styles.chartTitle}>CPF balance trajectory{showCpfis ? ' + CPFIS' : ''}</div>
            <div className={styles.chartSub}>
              All accounts · accumulation through CPF LIFE payout ·{' '}
              {inflAdj ? "inflation-adjusted" : "nominal dollars"}
            </div>
          </div>
          <div className={styles.legend}>
            {legendItems.map(([c, l]) => (
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
            showCpfis={showCpfis}
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
          <button key={t.id} type="button"
            className={`${styles.tab} ${activeTab === t.id ? styles.tabOn : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.tabBody}>
        {activeTab === 'plans' && (
          <PlanComparison raAtPayoutStart={raAtPayoutStart} selectedPlan={form.cpfPlan}
            payoutStartAge={form.payoutStartAge} planHorizon={form.planHorizon}
            inflAdj={inflAdj} inflAtPayout={inflAtPayout} />
        )}
        {activeTab === 'deferral' && (
          <DeferralTab raAtPayoutStart={raAtPayoutStart} plan={form.cpfPlan}
            selectedAge={form.payoutStartAge} planHorizon={form.planHorizon}
            inflAdj={inflAdj} inflAtPayout={inflAtPayout} />
        )}
        {activeTab === 'retirement' && <RetirementSumTab summary={summary} />}
        {activeTab === 'events'     && <LifeEventsTab form={form} summary={summary} />}
        {activeTab === 'table'      && <YearTable rows={annual} inflAdj={inflAdj} showCpfis={showCpfis} />}
      </div>

      <div className={styles.disclaimer}>
        Estimates only · CPF rules effective 1 Jan 2026 · CPFIS returns are not guaranteed ·
        Not financial advice ·{' '}
        <a href="https://www.cpf.gov.sg" target="_blank" rel="noopener noreferrer">CPF Board →</a>
      </div>
    </div>
  );
}
