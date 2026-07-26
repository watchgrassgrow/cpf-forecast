import React from 'react';
import type { FormState, SimSummary } from '../types';
import styles from './LifeEventsTab.module.css';

interface Props {
  form: FormState;
  summary: SimSummary;
}

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-SG');
}

export default function LifeEventsTab({ form, summary }: Props) {
  const { totalTopUpsApplied, totalTopUpsRejected, housingLiability } = summary.lifeEvents;
  const hasEvents = form.topUps.length > 0 || form.housing.length > 0;

  if (!hasEvents) {
    return (
      <div className={styles.empty}>
        <p>No life events added to this forecast.</p>
        <p className={styles.emptySub}>
          Go back to the <strong>Life Events</strong> step to add cash top-ups or a property
          purchase and see their impact here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {form.topUps.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Cash top-ups</div>
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Total applied</div>
              <div className={styles.statValue}>{fmt(totalTopUpsApplied)}</div>
            </div>
            {totalTopUpsRejected > 0 && (
              <div className={styles.stat}>
                <div className={styles.statLabel}>Rejected (cap reached)</div>
                <div className={`${styles.statValue} ${styles.statWarn}`}>{fmt(totalTopUpsRejected)}</div>
              </div>
            )}
          </div>
          {totalTopUpsRejected > 0 && (
            <p className={styles.warnNote}>
              Some top-up amounts exceeded the available headroom (FRS/ERS for RSTU, the CPF
              Annual Limit for voluntary top-ups, or the BHS for MediSave) and weren't applied.
              Adjust the amounts or dates in the Life Events step if you'd like everything to fit.
            </p>
          )}
          <div className={styles.list}>
            {form.topUps.map(t => (
              <div key={t.id} className={styles.listItem}>
                <span className={styles.listKind}>{t.kind === 'rstu' ? 'RSTU' : t.kind === 'voluntary3' ? 'Voluntary (3)' : 'MediSave'}</span>
                <span className={styles.listDetail}>${t.amount.toLocaleString()} · {t.date.slice(0, 7)}{t.repeatAnnually ? ` → ${t.repeatUntilYear}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {form.housing.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Property / mortgage</div>
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>OA principal withdrawn</div>
              <div className={styles.statValue}>{fmt(housingLiability.principal)}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Accrued interest owed</div>
              <div className={styles.statValue}>{fmt(housingLiability.accrued)}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Total liability at 55</div>
              <div className={`${styles.statValue} ${styles.statHighlight}`}>{fmt(housingLiability.total)}</div>
            </div>
          </div>
          <p className={styles.note}>
            This is the amount that would need to be refunded to CPF (from sale proceeds) if you
            sold an unsold property right at age 55. It's separate from your live OA balance — CPF
            tracks it as a running "loan to yourself" that accrues interest at the OA rate.
          </p>
          <div className={styles.list}>
            {form.housing.map(h => (
              <div key={h.id} className={styles.listItem}>
                <span className={styles.listKind}>{h.label || 'Property'}</span>
                <span className={styles.listDetail}>
                  ${h.oaDownpayment.toLocaleString()} down + ${h.monthlyOaInstalment.toLocaleString()}/mo
                  × {h.loanTenureYears}yr · from {h.purchaseDate.slice(0, 7)}
                  {h.planSale && ` · sells ${h.saleDate.slice(0, 7)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
