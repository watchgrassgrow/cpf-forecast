import React, { useState } from 'react';
import type { SimSummary, FormState } from '../types';
import styles from './Age55Breakdown.module.css';

interface Props {
  summary: SimSummary;
  form: FormState;
}

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-SG');
}
function fmtK(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'k';
  return '$' + Math.round(n).toLocaleString('en-SG');
}

export default function Age55Breakdown({ summary, form }: Props) {
  const [expanded, setExpanded] = useState(false);
  const t = summary.transformation;
  if (!t) return null;

  const rsLabel = form.rsTarget === 'BRS' ? 'Basic Retirement Sum (BRS)'
    : form.rsTarget === 'ERS' ? 'Enhanced Retirement Sum (ERS)'
    : 'Full Retirement Sum (FRS)';

  const rsShort = form.rsTarget;

  // Liquid OA = OA balance after the retirement sum has been set aside.
  // This is freely withdrawable in cash by the member (above 55 with RS met).
  const liquidOA = t.oaAfter;

  // SA contributed to RA + OA drawdown to cover shortfall
  const fromSA = t.saToRa;
  const fromOA = t.oaToRa;

  // If SA > retirement sum target, the surplus flowed to OA (withdrawable)
  const saSurplusToOA = t.saSurplus;

  // Total liquid = liquid OA (already includes the SA surplus since the
  // engine adds it back into OA during the transformation)
  const totalLiquid = liquidOA;

  // Monthly interest the liquid OA generates at 2.5% p.a.
  const monthlyOaInterest = Math.round((totalLiquid * 0.025) / 12);
  // Monthly interest if kept and compounding (inflation-adjusted context)
  const annualOaInterest = Math.round(totalLiquid * 0.025);

  // Pre-transformation totals (for the "where did it come from" breakdown)
  const saBeforeTransform = t.saToRa + t.saSurplus; // = original SA balance
  const oaBeforeTransform = t.oaAfter + t.oaToRa;   // = original OA balance

  const rsTargetAmt = t.target;
  const raFunded = t.raAfter;

  // How well funded is the RA vs target?
  const fullyFunded = raFunded >= rsTargetAmt - 1;

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header} onClick={() => setExpanded(e => !e)}>
        <div className={styles.headerLeft}>
          <span className={styles.age55Badge}>Age 55</span>
          <div>
            <div className={styles.headerTitle}>CPF at age 55 — what stays, what's set aside</div>
            <div className={styles.headerSub}>Year {t.year} · {rsLabel}</div>
          </div>
        </div>
        <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Summary row — always visible */}
      <div className={styles.summaryRow}>
        {/* Set aside in RA */}
        <div className={styles.summaryBlock}>
          <div className={styles.blockLabel}>Set aside in RA ({rsShort})</div>
          <div className={styles.blockAmt} style={{ color: '#1D9E75' }}>{fmtK(raFunded)}</div>
          <div className={styles.blockSub}>
            {fullyFunded
              ? `✓ ${rsLabel} fully funded`
              : `⚠ Shortfall — only ${fmtK(raFunded)} of ${fmtK(rsTargetAmt)} target`}
          </div>
          <div className={styles.blockNote}>→ Funds your CPF LIFE monthly payout from age {form.payoutStartAge}</div>
        </div>

        <div className={styles.dividerVert} />

        {/* Liquid OA */}
        <div className={styles.summaryBlock}>
          <div className={styles.blockLabel}>Liquid cash (OA remainder)</div>
          <div className={styles.blockAmt} style={{ color: '#378ADD' }}>{fmtK(totalLiquid)}</div>
          <div className={styles.blockSub}>Freely withdrawable in cash</div>
          <div className={styles.interestBox}>
            <div className={styles.interestRow}>
              <span className={styles.interestLabel}>Monthly interest (2.5% p.a.)</span>
              <span className={styles.interestAmt}>${monthlyOaInterest.toLocaleString('en-SG')}/mo</span>
            </div>
            <div className={styles.interestRow}>
              <span className={styles.interestLabel}>Annual interest</span>
              <span className={styles.interestAmt}>${annualOaInterest.toLocaleString('en-SG')}/yr</span>
            </div>
            <div className={styles.interestNote}>
              If you leave this in OA and don't withdraw, it earns this passively every month.
              Withdraw gradually to supplement daily living while the remainder keeps compounding.
            </div>
          </div>
          <div className={styles.blockNote}>OA continues earning 2.5% on whatever remains</div>
        </div>

        <div className={styles.dividerVert} />

        {/* MediSave — restricted */}
        <div className={styles.summaryBlock}>
          <div className={styles.blockLabel}>MediSave (MA)</div>
          <div className={styles.blockAmt} style={{ color: '#BA7517' }}>
            {/* We use the age-55 annual row for MA since transform doesn't track MA */}
            {fmtK(summary.annual.find(r => r.is55Event)?.ma ?? 0)}
          </div>
          <div className={styles.blockSub}>Restricted — healthcare use only</div>
          <div className={styles.blockNote}>Not withdrawable as cash</div>
        </div>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div className={styles.breakdown}>
          <div className={styles.breakdownTitle}>How the RA was funded</div>

          <div className={styles.flowRows}>
            <div className={styles.flowRow}>
              <div className={styles.flowSource}>
                <span className={styles.flowDot} style={{ background: '#1D9E75' }} />
                <span>SA balance transferred to RA</span>
              </div>
              <span className={styles.flowAmt}>{fmt(fromSA)}</span>
            </div>

            {fromOA > 0 && (
              <div className={styles.flowRow}>
                <div className={styles.flowSource}>
                  <span className={styles.flowDot} style={{ background: '#378ADD' }} />
                  <span>OA drawn to cover RA shortfall</span>
                </div>
                <span className={styles.flowAmt}>− {fmt(fromOA)}</span>
              </div>
            )}

            {saSurplusToOA > 0 && (
              <div className={styles.flowRow}>
                <div className={styles.flowSource}>
                  <span className={styles.flowDot} style={{ background: '#94A3B8' }} />
                  <span>SA surplus above {rsShort} returned to OA</span>
                </div>
                <span className={styles.flowAmt} style={{ color: '#1D9E75' }}>+ {fmt(saSurplusToOA)}</span>
              </div>
            )}

            <div className={styles.flowDivider} />

            <div className={`${styles.flowRow} ${styles.flowTotal}`}>
              <div className={styles.flowSource}>
                <span className={styles.flowDot} style={{ background: '#0F6E56' }} />
                <span>RA created ({rsShort} target: {fmt(rsTargetAmt)})</span>
              </div>
              <span className={styles.flowAmt} style={{ color: '#0F6E56' }}>{fmt(raFunded)}</span>
            </div>
          </div>

          <div className={styles.breakdownNote}>
            <strong>SA is permanently closed at 55.</strong> All SA savings are transferred to RA first
            (up to the {rsShort} target). Any SA balance above the target is returned to OA as
            liquid cash.{fromOA > 0 && ` Because SA alone wasn't enough to meet the ${rsShort}, an additional
            ${fmt(fromOA)} was drawn from OA.`} After this, only OA, RA and MA remain.
          </div>

          {form.rsTarget === 'BRS' && (
            <div className={styles.pledgeNote}>
              🏠 <strong>Property pledge:</strong> You've selected BRS, which requires pledging a
              property with lease covering you to age 95+. This allows you to keep more cash liquid
              but reduces your monthly CPF LIFE payout compared to FRS or ERS.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
