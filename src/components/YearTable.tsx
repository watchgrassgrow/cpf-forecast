import React from 'react';
import type { AnnualRow } from '../types';
import styles from './YearTable.module.css';

interface Props {
  rows: AnnualRow[];
  inflAdj: boolean;
}

/** Compact format: $1.23M, $567k, $1,234 — keeps table columns narrow */
function fmtAmt(n: number, infl: number, adj: boolean): string {
  const v = adj ? n / infl : n;
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000)     return '$' + Math.round(v / 1_000) + 'k';
  return '$' + Math.round(v).toLocaleString('en-SG');
}

/** Full format for tooltip / title attribute */
function fmtFull(n: number, infl: number, adj: boolean): string {
  const v = adj ? n / infl : n;
  return '$' + Math.round(v).toLocaleString('en-SG');
}

export default function YearTable({ rows, inflAdj }: Props) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.left}>Year</th>
            <th>Age</th>
            <th>OA</th>
            <th>SA / RA</th>
            <th>MA</th>
            <th>Total CPF</th>
            <th>CPF LIFE (cumul.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isMilestone = r.is55Event;
            const phase = r.isPayout
              ? <span className={`${styles.pill} ${styles.pillPay}`}>Payout</span>
              : r.isPost55
                ? <span className={`${styles.pill} ${styles.pillPost}`}>Post-55</span>
                : <span className={`${styles.pill} ${styles.pillAcc}`}>Accum.</span>;

            return (
              <tr key={r.year} className={isMilestone ? styles.milestone : undefined}>
                <td className={styles.left}>
                  <span className={styles.year}>{r.year}</span>
                  {phase}
                </td>
                <td>{r.age}</td>
                <td title={fmtFull(r.oa, r.inflFactor, inflAdj)}>
                  {fmtAmt(r.oa, r.inflFactor, inflAdj)}
                </td>
                <td title={fmtFull(r.saOrRa, r.inflFactor, inflAdj)}>
                  {fmtAmt(r.saOrRa, r.inflFactor, inflAdj)}
                </td>
                <td title={fmtFull(r.ma, r.inflFactor, inflAdj)}>
                  {fmtAmt(r.ma, r.inflFactor, inflAdj)}
                </td>
                <td className={styles.bold} title={fmtFull(r.total, r.inflFactor, inflAdj)}>
                  {fmtAmt(r.total, r.inflFactor, inflAdj)}
                </td>
                <td className={r.cumPayout > 0 ? styles.payout : styles.dash}
                    title={r.cumPayout > 0 ? fmtFull(r.cumPayout, r.inflFactor, inflAdj) : undefined}>
                  {r.cumPayout > 0 ? fmtAmt(r.cumPayout, r.inflFactor, inflAdj) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
