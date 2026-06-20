import React from 'react';
import styles from './EmptyState.module.css';

export default function EmptyState() {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="52" height="52" rx="14" fill="#F1F5F9"/>
          <path d="M12 38 L20 24 L27 31 L34 18 L42 22" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="42" cy="22" r="3" fill="#1D9E75" opacity="0.4"/>
          <path d="M12 38 L20 24 L27 31 L34 18 L42 22" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
        </svg>
      </div>
      <h2 className={styles.title}>Your CPF forecast will appear here</h2>
      <p className={styles.sub}>
        Fill in the 4 steps on the left, then press{' '}
        <strong>Calculate</strong> to see your full retirement projection.
      </p>
      <div className={styles.steps}>
        {['Enter your profile & salary', 'Add your current CPF balances', 'Set retirement preferences', 'Review assumptions & calculate'].map((s, i) => (
          <div key={i} className={styles.step}>
            <span className={styles.stepNum}>{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
