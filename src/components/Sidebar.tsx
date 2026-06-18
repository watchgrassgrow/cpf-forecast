import React from 'react';
import { ChipGroup, SliderField, NumberField, SectionLabel } from './Primitives';
import type { FormState } from '../types';
import styles from './Sidebar.module.css';

interface Props {
  form: FormState;
  step: number;
  onFormChange: (patch: Partial<FormState>) => void;
  onNext: () => void;
  onBack: () => void;
  onCalculate: () => void;
}

const TOTAL_STEPS = 4;
const STEP_LABELS = ['Profile', 'Balances', 'Retirement', 'Assumptions'];

const RS_TIPS: Record<string, string> = {
  BRS: 'Basic Retirement Sum — requires property pledge (own property with lease to age 95+)',
  FRS: 'Full Retirement Sum — recommended for most members, no property required',
  ERS: 'Enhanced Retirement Sum — maximises your CPF LIFE monthly payout',
};

const PLAN_TIPS: Record<string, string> = {
  Standard: 'Level monthly payout for life — most predictable',
  Escalating: 'Starts ~12% lower, grows 2%/yr — better inflation hedge over 25+ years',
  Basic: 'Higher early payout while RA pool healthy — may suit those with shorter horizon',
};

export default function Sidebar({ form, step, onFormChange, onNext, onBack, onCalculate }: Props) {
  const set = (patch: Partial<FormState>) => onFormChange(patch);
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandName}>CPF Forecast</div>
        <div className={styles.brandTag}>Singapore · 2026 official rates</div>
      </div>

      {/* Progress */}
      <div className={styles.progress}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`${styles.seg} ${i === step ? styles.segOn : i < step ? styles.segDone : ''}`}
            title={STEP_LABELS[i]}
          />
        ))}
      </div>
      <div className={styles.stepLabel}>{STEP_LABELS[step]}</div>

      {/* Step panels */}
      <div className={styles.body}>
        {step === 0 && (
          <>
            <SectionLabel>Your profile</SectionLabel>
            <div className={styles.field}>
              <label className={styles.label}>Date of birth</label>
              <input type="date" value={form.dob} max={new Date().toISOString().slice(0, 10)}
                onChange={e => set({ dob: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Citizenship / residency status</label>
              <ChipGroup
                options={[
                  { label: 'SC / PR 3yr+', value: 'SC_PR3' },
                  { label: 'PR 2nd yr', value: 'SPR2_GG' },
                  { label: 'PR 1st yr', value: 'SPR1_GG' },
                ]}
                value={form.scheme}
                onChange={v => set({ scheme: v as any })}
              />
            </div>
            <div className={styles.fieldRow}>
              <NumberField label="Monthly salary (OW)" value={form.monthlyOW} step={100} prefix="$"
                onChange={v => set({ monthlyOW: v })} tip="Gross ordinary wage before CPF" />
              <NumberField label="Annual bonus (AW)" value={form.annualAW} step={500} prefix="$"
                onChange={v => set({ annualAW: v })} />
            </div>
            <SliderField label="Annual salary growth" value={form.salaryGrowth} min={0} max={10} step={0.5}
              format={v => `${v.toFixed(1)}%`} onChange={v => set({ salaryGrowth: v })}
              tip="Applied at the start of each subsequent calendar year" />
            <div className={styles.field}>
              <label className={styles.label}>Bonus paid in month</label>
              <ChipGroup
                options={[
                  { label: 'Mar', value: 3 }, { label: 'Jun', value: 6 },
                  { label: 'Sep', value: 9 }, { label: 'Dec', value: 12 },
                ]}
                value={form.bonusMonth}
                onChange={v => set({ bonusMonth: v as number })}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <SectionLabel>Current CPF balances</SectionLabel>
            <NumberField label="Ordinary Account (OA)" value={form.balOA} step={1000} prefix="$"
              onChange={v => set({ balOA: v })} tip="Check your CPF statement or the CPF mobile app" />
            <NumberField label="Special Account (SA)" value={form.balSA} step={1000} prefix="$"
              onChange={v => set({ balSA: v })} />
            <NumberField label="MediSave Account (MA)" value={form.balMA} step={1000} prefix="$"
              onChange={v => set({ balMA: v })} tip="Capped at the Basic Healthcare Sum ($79,000 in 2026)" />
            <div className={styles.infoBox}>
              <strong>Where to find your balances:</strong> Log in to the CPF website, CPF mobile app,
              or check your annual CPF statement (mailed each January).
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <SectionLabel>Retirement preferences</SectionLabel>
            <div className={styles.field}>
              <label className={styles.label}>Retirement sum target at age 55</label>
              <ChipGroup
                options={[
                  { label: 'BRS', value: 'BRS', tip: RS_TIPS.BRS },
                  { label: 'FRS', value: 'FRS', tip: RS_TIPS.FRS },
                  { label: 'ERS', value: 'ERS', tip: RS_TIPS.ERS },
                ]}
                value={form.rsTarget}
                onChange={v => set({ rsTarget: v as any, propertyPledge: v === 'BRS' })}
              />
              <p className={styles.tip}>{RS_TIPS[form.rsTarget]}</p>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>CPF LIFE plan</label>
              <ChipGroup
                options={[
                  { label: 'Standard', value: 'Standard', tip: PLAN_TIPS.Standard },
                  { label: 'Escalating', value: 'Escalating', tip: PLAN_TIPS.Escalating },
                  { label: 'Basic', value: 'Basic', tip: PLAN_TIPS.Basic },
                ]}
                value={form.cpfPlan}
                onChange={v => set({ cpfPlan: v as any })}
              />
              <p className={styles.tip}>{PLAN_TIPS[form.cpfPlan]}</p>
            </div>
            <SliderField
              label="Payout start age"
              value={form.payoutStartAge}
              min={65} max={70} step={1}
              format={v => `${v}`}
              onChange={v => set({ payoutStartAge: v })}
              tip="Each year deferred adds ~6.5% to monthly payout (up to age 70)"
            />
            <div className={styles.field}>
              <label className={styles.label}>Planning horizon (life expectancy)</label>
              <ChipGroup
                options={[
                  { label: 'Age 85', value: 85 }, { label: 'Age 90', value: 90 },
                  { label: 'Age 95', value: 95 }, { label: 'Age 100', value: 100 },
                ]}
                value={form.planHorizon}
                onChange={v => set({ planHorizon: v as number })}
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <SectionLabel>Economic assumptions</SectionLabel>
            <div className={styles.infoBox} style={{ marginBottom: 14 }}>
              Official CPF rates are locked in. Adjust projection assumptions for years
              beyond the published schedule.
            </div>
            <SliderField label="OA interest rate (official: 2.5%)" value={form.oaRate}
              min={1} max={5} step={0.25} format={v => `${v.toFixed(2)}%`}
              onChange={v => set({ oaRate: v })} />
            <SliderField label="SA / MA / RA interest rate (official: 4.0%)" value={form.srmaRate}
              min={2} max={6} step={0.25} format={v => `${v.toFixed(2)}%`}
              onChange={v => set({ srmaRate: v })} />
            <SliderField label="Inflation rate (for adjusted view)" value={form.inflationRate}
              min={0} max={6} step={0.25} format={v => `${v.toFixed(2)}%`}
              onChange={v => set({ inflationRate: v })} />
            <div className={styles.field}>
              <label className={styles.label}>Extra interest scheme</label>
              <ChipGroup
                options={[
                  { label: 'Enabled', value: 'yes' },
                  { label: 'Disabled', value: 'no' },
                ]}
                value={form.extraInterest ? 'yes' : 'no'}
                onChange={v => set({ extraInterest: v === 'yes' })}
              />
              <p className={styles.tip}>+1% on first $60k of combined balances (below 55); +2%/+1% above 55</p>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className={styles.nav}>
        {step > 0 && (
          <button className={styles.btnBack} onClick={onBack} type="button">← Back</button>
        )}
        {isLast ? (
          <button className={styles.btnCalc} onClick={onCalculate} type="button">
            Calculate →
          </button>
        ) : (
          <button className={styles.btnNext} onClick={onNext} type="button">
            {STEP_LABELS[step + 1]} →
          </button>
        )}
      </div>
    </aside>
  );
}
