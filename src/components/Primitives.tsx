import React from 'react';
import styles from './Primitives.module.css';

// ── Chip selector ──────────────────────────────────────────────────────────
interface ChipGroupProps<T extends string | number> {
  options: { label: string; value: T; tip?: string }[];
  value: T;
  onChange: (v: T) => void;
}
export function ChipGroup<T extends string | number>({ options, value, onChange }: ChipGroupProps<T>) {
  return (
    <div className={styles.chipGroup}>
      {options.map(o => (
        <button
          key={String(o.value)}
          className={`${styles.chip} ${value === o.value ? styles.chipOn : ''}`}
          onClick={() => onChange(o.value)}
          title={o.tip}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Slider with live value display ─────────────────────────────────────────
interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  tip?: string;
}
export function SliderField({ label, value, min, max, step, format, onChange, tip }: SliderFieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.sliderHeader}>
        <label className={styles.label}>{label}</label>
        <span className={styles.sliderVal}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      {tip && <p className={styles.tip}>{tip}</p>}
    </div>
  );
}

// ── Number input field ──────────────────────────────────────────────────────
interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  step?: number;
  prefix?: string;
  onChange: (v: number) => void;
  tip?: string;
}
export function NumberField({ label, value, min = 0, step = 100, prefix, onChange, tip }: NumberFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputWrap}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          onFocus={e => e.target.select()}
          style={prefix ? { paddingLeft: '26px' } : undefined}
        />
      </div>
      {tip && <p className={styles.tip}>{tip}</p>}
    </div>
  );
}

// ── Section label ───────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className={styles.sectionLabel}>{children}</div>;
}

// ── Toggle switch ───────────────────────────────────────────────────────────
interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className={styles.toggle}>
      <div
        className={`${styles.toggleTrack} ${checked ? styles.toggleOn : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={e => e.key === ' ' && onChange(!checked)}
      >
        <div className={styles.toggleKnob} />
      </div>
      <span className={styles.toggleLabel}>{label}</span>
    </label>
  );
}

// ── KPI card ────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}
export function KpiCard({ label, value, sub, highlight }: KpiCardProps) {
  return (
    <div className={`${styles.kpiCard} ${highlight ? styles.kpiHighlight : ''}`}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}

// ── Gauge bar ───────────────────────────────────────────────────────────────
interface GaugeProps {
  label: string;
  description: string;
  current: number;
  target: number;
  color: string;
}
export function Gauge({ label, description, current, target, color }: GaugeProps) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const met = pct >= 100;
  return (
    <div className={styles.gauge}>
      <div className={styles.gaugeHeader}>
        <div>
          <span className={styles.gaugeLabel}>{label}</span>
          <span className={styles.gaugeDesc}> — {description}</span>
        </div>
        <span className={styles.gaugeStat} style={{ color: met ? 'var(--teal)' : 'var(--slate-500)' }}>
          {met ? '✓ Met' : `${pct}% funded`}
        </span>
      </div>
      <div className={styles.gaugeTrack}>
        <div className={styles.gaugeFill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
