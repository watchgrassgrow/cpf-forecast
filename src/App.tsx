import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EmptyState from './components/EmptyState';
import { runSimulation } from './simulate';
import type { FormState, SimSummary } from './types';
import { DEFAULT_FORM } from './types';
import styles from './App.module.css';

export default function App() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState<SimSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patchForm = useCallback((patch: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

  const handleCalculate = useCallback(() => {
    setError(null);
    try {
      const age = (() => {
        const d = new Date(form.dob + 'T00:00:00Z');
        const now = new Date();
        let a = now.getUTCFullYear() - d.getUTCFullYear();
        if ((now.getUTCMonth() + 1) * 100 + now.getUTCDate() <
            (d.getUTCMonth() + 1) * 100 + d.getUTCDate()) a--;
        return a;
      })();

      if (!form.dob || isNaN(new Date(form.dob).getTime())) {
        setError('Please enter a valid date of birth.');
        return;
      }
      if (age < 16 || age >= 70) {
        setError('Please enter a date of birth for a member currently aged 16–69.');
        return;
      }
      if (form.monthlyOW < 0 || form.annualAW < 0) {
        setError('Wage values must be non-negative.');
        return;
      }

      const result = runSimulation(form);
      setSummary(result);
    } catch (e) {
      console.error(e);
      setError('An unexpected error occurred running the simulation. Please check your inputs.');
    }
  }, [form]);

  return (
    <div className={styles.app}>
      <Sidebar
        form={form}
        step={step}
        onFormChange={patchForm}
        onNext={() => setStep(s => Math.min(4, s + 1))}
        onBack={() => setStep(s => Math.max(0, s - 1))}
        onCalculate={handleCalculate}
      />
      <main className={styles.main}>
        {error && (
          <div className={styles.error} role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}
        {summary ? (
          <Dashboard summary={summary} form={form} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
