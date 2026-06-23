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
        Fill in the 5 steps on the left, then press{' '}
        <strong>Calculate</strong> to see your full retirement projection.
      </p>
      <div className={styles.steps}>
        {['Enter your profile & salary', 'Add your current CPF balances', 'Set retirement preferences', 'Add life events (optional)', 'Review assumptions & calculate'].map((s, i) => (
          <div key={i} className={styles.step}>
            <span className={styles.stepNum}>{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <div className={styles.disclaimer}>
        <div className={styles.disclaimerHeader}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.71-2.96L13.71 3.86a2 2 0 0 0-3.42 0z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Important disclaimer</span>
        </div>
        <p>
          This is an independent, unofficial tool built as a personal best-effort project. It is{' '}
          <strong>not affiliated with, endorsed by, or verified by the CPF Board</strong>, and it
          is not a substitute for financial, tax, or retirement planning advice.
        </p>
        <p>
          The calculations are estimates based on the developer's interpretation of publicly
          available CPF rules and may contain errors, omissions, or outdated information. CPF
          policies, rates, and retirement sums are also subject to change by the authorities at
          any time without notice.
        </p>
        <p>
          By using this tool, you acknowledge that you do so <strong>at your own risk</strong>.
          The developer makes no warranties as to the accuracy, completeness, or reliability of
          any figures shown, and accepts no liability for any loss, damage, or decision made in
          reliance on this tool. Always verify your figures using official CPF Board resources at{' '}
          <a href="https://www.cpf.gov.sg" target="_blank" rel="noopener noreferrer">cpf.gov.sg</a>{' '}
          before making any financial decisions.
        </p>
      </div>
    </div>
  );
}
