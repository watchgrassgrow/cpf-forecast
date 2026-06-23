import React, { useState } from 'react';
import { SectionLabel, ChipGroup, NumberField, Toggle } from './Primitives';
import { newTopUpEvent, newHousingEvent } from '../types';
import type { FormState, UiTopUpEvent, UiHousingEvent, TopUpKind } from '../types';
import styles from './LifeEventsStep.module.css';

interface Props {
  form: FormState;
  onFormChange: (patch: Partial<FormState>) => void;
}

const TOPUP_KIND_LABELS: Record<TopUpKind, { label: string; tip: string }> = {
  rstu: {
    label: 'RSTU',
    tip: 'Retirement Sum Topping-Up: cash → SA (or RA after 55), capped by headroom to FRS/ERS',
  },
  voluntary3: {
    label: 'Voluntary (3 accounts)',
    tip: 'Cash split across OA/SA/MA by your age-based ratio, capped by the CPF Annual Limit ($37,740)',
  },
  medisave: {
    label: 'MediSave top-up',
    tip: 'Cash → MA only, capped by headroom to the Basic Healthcare Sum',
  },
};

export default function LifeEventsStep({ form, onFormChange }: Props) {
  const [expandedTopUp, setExpandedTopUp] = useState<string | null>(null);
  const [expandedHousing, setExpandedHousing] = useState<string | null>(null);

  const addTopUp = () => {
    const e = newTopUpEvent();
    onFormChange({ topUps: [...form.topUps, e] });
    setExpandedTopUp(e.id);
  };
  const updateTopUp = (id: string, patch: Partial<UiTopUpEvent>) => {
    onFormChange({ topUps: form.topUps.map(t => t.id === id ? { ...t, ...patch } : t) });
  };
  const removeTopUp = (id: string) => {
    onFormChange({ topUps: form.topUps.filter(t => t.id !== id) });
  };

  const addHousing = () => {
    const e = newHousingEvent();
    onFormChange({ housing: [...form.housing, e] });
    setExpandedHousing(e.id);
  };
  const updateHousing = (id: string, patch: Partial<UiHousingEvent>) => {
    onFormChange({ housing: form.housing.map(h => h.id === id ? { ...h, ...patch } : h) });
  };
  const removeHousing = (id: string) => {
    onFormChange({ housing: form.housing.filter(h => h.id !== id) });
  };

  return (
    <div>
      <SectionLabel>Life events (optional)</SectionLabel>
      <p className={styles.intro}>
        Add voluntary CPF top-ups or property purchases to see their impact on your forecast.
        Skip this step if you just want the default contribution-driven projection.
      </p>

      {/* ── Top-ups ───────────────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles.groupHeader}>
          <span className={styles.groupTitle}>Cash top-ups</span>
          <button type="button" className={styles.addBtn} onClick={addTopUp}>+ Add</button>
        </div>

        {form.topUps.length === 0 && (
          <p className={styles.emptyHint}>No top-ups added.</p>
        )}

        {form.topUps.map(event => {
          const isOpen = expandedTopUp === event.id;
          return (
            <div key={event.id} className={styles.card}>
              <div className={styles.cardHeader} onClick={() => setExpandedTopUp(isOpen ? null : event.id)}>
                <div>
                  <span className={styles.cardTitle}>{TOPUP_KIND_LABELS[event.kind].label}</span>
                  <span className={styles.cardSub}> · ${event.amount.toLocaleString()} · {event.date.slice(0, 7)}</span>
                  {event.repeatAnnually && <span className={styles.recurBadge}>recurring</span>}
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={e => { e.stopPropagation(); removeTopUp(event.id); }}
                  aria-label="Remove top-up"
                >×</button>
              </div>

              {isOpen && (
                <div className={styles.cardBody}>
                  <div className={styles.field}>
                    <label className={styles.label}>Type</label>
                    <ChipGroup
                      options={[
                        { label: 'RSTU', value: 'rstu', tip: TOPUP_KIND_LABELS.rstu.tip },
                        { label: 'Voluntary (3)', value: 'voluntary3', tip: TOPUP_KIND_LABELS.voluntary3.tip },
                        { label: 'MediSave', value: 'medisave', tip: TOPUP_KIND_LABELS.medisave.tip },
                      ]}
                      value={event.kind}
                      onChange={v => updateTopUp(event.id, { kind: v as TopUpKind })}
                    />
                    <p className={styles.tip}>{TOPUP_KIND_LABELS[event.kind].tip}</p>
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Date</label>
                      <input
                        type="date"
                        value={event.date}
                        onChange={e => updateTopUp(event.id, { date: e.target.value })}
                      />
                    </div>
                    <NumberField
                      label="Amount"
                      value={event.amount}
                      step={500}
                      prefix="$"
                      onChange={v => updateTopUp(event.id, { amount: v })}
                    />
                  </div>
                  <div className={styles.field}>
                    <Toggle
                      checked={event.repeatAnnually}
                      onChange={v => updateTopUp(event.id, { repeatAnnually: v })}
                      label="Repeat annually (same month, same amount)"
                    />
                  </div>
                  {event.repeatAnnually && (
                    <NumberField
                      label="Repeat until year"
                      value={event.repeatUntilYear}
                      step={1}
                      onChange={v => updateTopUp(event.id, { repeatUntilYear: v })}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Housing ───────────────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles.groupHeader}>
          <span className={styles.groupTitle}>Property / mortgage</span>
          <button type="button" className={styles.addBtn} onClick={addHousing}>+ Add</button>
        </div>

        {form.housing.length === 0 && (
          <p className={styles.emptyHint}>No properties added.</p>
        )}

        {form.housing.map(event => {
          const isOpen = expandedHousing === event.id;
          return (
            <div key={event.id} className={styles.card}>
              <div className={styles.cardHeader} onClick={() => setExpandedHousing(isOpen ? null : event.id)}>
                <div>
                  <span className={styles.cardTitle}>{event.label || 'Property'}</span>
                  <span className={styles.cardSub}> · ${event.oaDownpayment.toLocaleString()} down · {event.purchaseDate.slice(0, 7)}</span>
                  {event.planSale && <span className={styles.recurBadge}>sale planned</span>}
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={e => { e.stopPropagation(); removeHousing(event.id); }}
                  aria-label="Remove property"
                >×</button>
              </div>

              {isOpen && (
                <div className={styles.cardBody}>
                  <div className={styles.field}>
                    <label className={styles.label}>Label</label>
                    <input
                      type="text"
                      value={event.label}
                      onChange={e => updateHousing(event.id, { label: e.target.value })}
                      placeholder="e.g. 4-room HDB, Punggol"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Purchase date</label>
                    <input
                      type="date"
                      value={event.purchaseDate}
                      onChange={e => updateHousing(event.id, { purchaseDate: e.target.value })}
                    />
                  </div>
                  <div className={styles.fieldRow}>
                    <NumberField
                      label="OA downpayment"
                      value={event.oaDownpayment}
                      step={5000}
                      prefix="$"
                      onChange={v => updateHousing(event.id, { oaDownpayment: v })}
                    />
                    <NumberField
                      label="Monthly OA instalment"
                      value={event.monthlyOaInstalment}
                      step={100}
                      prefix="$"
                      onChange={v => updateHousing(event.id, { monthlyOaInstalment: v })}
                    />
                  </div>
                  <NumberField
                    label="Loan tenure (years)"
                    value={event.loanTenureYears}
                    step={1}
                    onChange={v => updateHousing(event.id, { loanTenureYears: v })}
                  />
                  <p className={styles.tip}>
                    CPF tracks OA used here as a loan to yourself — it accrues "accrued interest"
                    (at the OA rate) that must be refunded if you sell.
                  </p>

                  <div className={styles.field} style={{ marginTop: 10 }}>
                    <Toggle
                      checked={event.planSale}
                      onChange={v => updateHousing(event.id, { planSale: v })}
                      label="Plan to sell this property"
                    />
                  </div>
                  {event.planSale && (
                    <>
                      <div className={styles.field}>
                        <label className={styles.label}>Sale date</label>
                        <input
                          type="date"
                          value={event.saleDate}
                          onChange={e => updateHousing(event.id, { saleDate: e.target.value })}
                        />
                      </div>
                      <NumberField
                        label="Expected sale proceeds (cash, after paying off bank loan)"
                        value={event.saleProceeds}
                        step={10000}
                        prefix="$"
                        onChange={v => updateHousing(event.id, { saleProceeds: v })}
                        tip="CPF refunds principal + accrued interest from this amount; any shortfall is forgiven"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
