import React from 'react';
import { Gauge } from './Primitives';
import type { SimSummary } from '../types';
import styles from './RetirementSumTab.module.css';

interface Props { summary: SimSummary; }

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-SG');
}

export default function RetirementSumTab({ summary }: Props) {
  const t = summary.transformation;
  const raAt55 = t ? t.raAfter : 0;
  const brs = t?.brs ?? 0;
  const frs = t?.frs ?? 0;
  const ers = t?.ers ?? 0;
  const cohortYear = t?.year ?? new Date().getFullYear();

  return (
    <div>
      <p className={styles.intro}>
        Projected RA at 55 vs <strong>{cohortYear}</strong> cohort retirement sums
        {t && ` · BRS ${fmt(brs)} · FRS ${fmt(frs)} · ERS ${fmt(ers)}`}
      </p>

      <div className={styles.gauges}>
        <Gauge
          label="BRS"
          description={`$${brs.toLocaleString('en-SG')} — Basic · requires property pledge`}
          current={raAt55}
          target={brs}
          color="var(--teal)"
        />
        <Gauge
          label="FRS"
          description={`$${frs.toLocaleString('en-SG')} — Full · recommended for most members`}
          current={raAt55}
          target={frs}
          color="var(--blue)"
        />
        <Gauge
          label="ERS"
          description={`$${ers.toLocaleString('en-SG')} — Enhanced · maximises monthly payout`}
          current={raAt55}
          target={ers}
          color="var(--amber)"
        />
      </div>

      {t && (
        <div className={styles.transformBox}>
          <div className={styles.transformTitle}>Age-55 Transformation ({t.year})</div>
          <p className={styles.transformSub}>
            When you turn 55, your SA closes and a Retirement Account (RA) is created.
            The following one-time sequence occurs:
          </p>
          <div className={styles.transformGrid}>
            <div className={styles.tCell}>
              <div className={styles.tLabel}>SA transferred to RA</div>
              <div className={styles.tVal}>{fmt(t.saToRa)}</div>
            </div>
            <div className={styles.tCell}>
              <div className={styles.tLabel}>OA drawn to cover shortfall</div>
              <div className={styles.tVal}>{fmt(t.oaToRa)}</div>
            </div>
            <div className={styles.tCell}>
              <div className={styles.tLabel}>SA surplus → OA (withdrawable)</div>
              <div className={styles.tVal}>{fmt(t.saSurplus)}</div>
            </div>
            <div className={styles.tCell}>
              <div className={styles.tLabel}>RA created</div>
              <div className={`${styles.tVal} ${styles.tValGreen}`}>{fmt(t.raAfter)}</div>
            </div>
            <div className={styles.tCell}>
              <div className={styles.tLabel}>OA balance after</div>
              <div className={styles.tVal}>{fmt(t.oaAfter)}</div>
            </div>
            <div className={styles.tCell}>
              <div className={styles.tLabel}>Target retirement sum</div>
              <div className={styles.tVal}>{fmt(t.target)}</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.notice}>
        Retirement sums grow approximately 3–4% per year. Your BRS and FRS are locked in
        at the year you turn 55 and stay fixed for life. The ERS rises annually and you
        can continue topping up to the prevailing ERS each year.
      </div>
    </div>
  );
}
