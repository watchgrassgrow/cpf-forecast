/**
 * generatePdfReport
 *
 * Opens a hidden print window containing a fully-formatted HTML report,
 * then triggers window.print() which the browser converts to PDF.
 *
 * Why this approach (over jsPDF / html2canvas):
 *  - Zero extra dependencies — no bundle size cost
 *  - Native font rendering — no blurry canvas screenshots
 *  - Proper multi-page pagination via CSS page-break rules
 *  - Works on all browsers and mobile (Share → Print → Save as PDF on iOS)
 *  - Charts don't print well as canvas elements, so we replace them with
 *    a clean year-by-year data table which is more useful in a report anyway
 */

import type { SimSummary, FormState } from '../types';

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-SG');
}
function fmtK(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'k';
  return '$' + Math.round(n).toLocaleString('en-SG');
}
function fmtAmt(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'k';
  return '$' + Math.round(n).toLocaleString('en-SG');
}

export function generatePdfReport(summary: SimSummary, form: FormState): void {
  const t = summary.transformation;
  const reportDate = new Date().toLocaleDateString('en-SG', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const currentAge = (() => {
    const d = new Date(form.dob + 'T00:00:00Z');
    const now = new Date();
    let age = now.getUTCFullYear() - d.getUTCFullYear();
    if ((now.getUTCMonth() + 1) * 100 + now.getUTCDate() <
        (d.getUTCMonth() + 1) * 100 + d.getUTCDate()) age--;
    return age;
  })();

  const rsLabel = form.rsTarget === 'BRS' ? 'Basic Retirement Sum (BRS)'
    : form.rsTarget === 'ERS' ? 'Enhanced Retirement Sum (ERS)'
    : 'Full Retirement Sum (FRS)';

  const liquidOA = t?.oaAfter ?? 0;
  const monthlyOAInterest = Math.round((liquidOA * 0.025) / 12);
  const annualOAInterest = Math.round(liquidOA * 0.025);

  // Year-by-year table rows
  const tableRows = summary.annual.map(r => {
    const phase = r.isPayout ? 'Payout' : r.isPost55 ? 'Post-55' : 'Accum.';
    const phaseColor = r.isPayout ? '#633806' : r.isPost55 ? '#185FA5' : '#085041';
    const phaseBg   = r.isPayout ? '#FAEEDA' : r.isPost55 ? '#E6F1FB' : '#E1F5EE';
    const milestone = r.is55Event ? 'background:#F0FBF7;font-weight:600;' : '';
    return `<tr style="${milestone}">
      <td>${r.year}</td>
      <td style="text-align:center">
        <span style="font-size:8px;padding:1px 5px;border-radius:8px;background:${phaseBg};color:${phaseColor}">${phase}</span>
      </td>
      <td style="text-align:center">${r.age}</td>
      <td>${fmtAmt(r.oa)}</td>
      <td>${fmtAmt(r.saOrRa)}</td>
      <td>${fmtAmt(r.ma)}</td>
      ${form.cpfisEnabled ? `<td>${r.cpfis > 0 ? fmtAmt(r.cpfis) : '—'}</td>` : ''}
      <td style="font-weight:600">${fmtAmt(form.cpfisEnabled ? r.totalWithCpfis : r.total)}</td>
      <td style="color:${r.cumPayout > 0 ? '#085041' : '#94A3B8'}">${r.cumPayout > 0 ? fmtAmt(r.cumPayout) : '—'}</td>
    </tr>`;
  }).join('');

  // CPF LIFE plan comparison rows
  const PLAN_RATIO: Record<string, number> = { Standard: 1, Escalating: 0.88, Basic: 1.08 };
  const FACTOR = 8.08 * Math.pow(1.065, form.payoutStartAge - 65);
  const planRows = ['Standard', 'Escalating', 'Basic'].map(plan => {
    const pm = Math.round((summary.raAtPayoutStart / 1000) * FACTOR * PLAN_RATIO[plan]);
    const years = form.planHorizon - form.payoutStartAge;
    let total = 0;
    if (plan === 'Escalating') {
      let p = pm;
      for (let y = 0; y < years; y++) { total += p * 12; p = Math.round(p * 1.02); }
    } else {
      total = pm * 12 * years;
    }
    const isSel = plan === form.cpfPlan;
    return `<tr style="${isSel ? 'background:#E1F5EE;font-weight:600' : ''}">
      <td>${plan}${isSel ? ' ★' : ''}</td>
      <td>$${pm.toLocaleString('en-SG')}/mo</td>
      <td>${plan === 'Escalating' ? '+2%/yr' : 'Level'}</td>
      <td>${fmtK(total)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CPF Forecast Report — ${reportDate}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      color: #1E293B;
      line-height: 1.5;
      background: white;
    }
    .page { max-width: 780px; margin: 0 auto; padding: 28px 32px; }

    /* Header */
    .report-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 2px solid #1D9E75; padding-bottom: 12px; margin-bottom: 20px;
    }
    .report-title { font-size: 20pt; font-weight: 700; color: #1D9E75; letter-spacing: -0.5px; }
    .report-sub { font-size: 9pt; color: #64748B; margin-top: 3px; }
    .report-meta { text-align: right; font-size: 8.5pt; color: #64748B; }
    .report-meta strong { display: block; font-size: 10pt; color: #1E293B; margin-bottom: 2px; }

    /* Section headings */
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title {
      font-size: 9pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.6px; color: #1D9E75; margin-bottom: 8px;
      padding-bottom: 4px; border-bottom: 1px solid #C6EFE2;
    }

    /* KPI grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 4px; }
    .kpi { border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; }
    .kpi.hl { border-color: #1D9E75; }
    .kpi-label { font-size: 7.5pt; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; }
    .kpi-val { font-size: 15pt; font-weight: 700; color: #1E293B; }
    .kpi.hl .kpi-val { color: #1D9E75; }
    .kpi-sub { font-size: 7.5pt; color: #94A3B8; margin-top: 2px; }

    /* Age-55 breakdown */
    .age55-card {
      border: 1.5px solid #1D9E75; border-radius: 8px; overflow: hidden; margin-bottom: 16px;
    }
    .age55-header {
      background: #F0FBF7; padding: 8px 14px;
      display: flex; align-items: center; gap: 10px;
    }
    .age55-badge {
      background: #1D9E75; color: white; font-size: 8pt; font-weight: 700;
      padding: 2px 8px; border-radius: 12px;
    }
    .age55-title { font-size: 10pt; font-weight: 600; color: #1E293B; }
    .age55-sub { font-size: 8pt; color: #64748B; }
    .age55-blocks { display: grid; grid-template-columns: repeat(3,1fr); }
    .age55-block { padding: 12px 14px; border-right: 1px solid #E2E8F0; }
    .age55-block:last-child { border-right: none; }
    .block-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #94A3B8; margin-bottom: 4px; }
    .block-amt { font-size: 16pt; font-weight: 700; margin-bottom: 2px; }
    .block-sub { font-size: 8pt; color: #64748B; margin-bottom: 4px; }
    .interest-box {
      background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 4px;
      padding: 6px 8px; font-size: 8pt;
    }
    .interest-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .interest-label { color: #1E40AF; }
    .interest-val { font-weight: 700; color: #1D4ED8; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    th {
      background: #F8FAFC; font-size: 7.5pt; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.3px; color: #64748B;
      padding: 6px 8px; text-align: right; border-bottom: 1.5px solid #E2E8F0;
    }
    th:first-child { text-align: left; }
    td { padding: 4px 8px; text-align: right; border-bottom: 1px solid #F1F5F9; color: #334155; }
    td:first-child { text-align: left; color: #1E293B; }
    tr:nth-child(even) td { background: #FAFAFA; }

    /* Flow table for age-55 breakdown */
    .flow-table { font-size: 9pt; margin: 8px 0; }
    .flow-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #E2E8F0; }
    .flow-row:last-child { border: none; font-weight: 600; }
    .flow-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }

    /* Inputs summary */
    .inputs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; font-size: 8.5pt; }
    .input-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #F1F5F9; }
    .input-label { color: #64748B; }
    .input-val { font-weight: 500; color: #1E293B; }

    /* Disclaimer */
    .disclaimer {
      font-size: 7.5pt; color: #94A3B8; line-height: 1.5;
      border-top: 1px solid #E2E8F0; padding-top: 10px; margin-top: 20px;
    }

    /* Print-specific */
    @media print {
      body { font-size: 9pt; }
      .page { padding: 16px 20px; }
      .section { page-break-inside: avoid; }
      .age55-card { page-break-inside: avoid; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      @page {
        size: A4;
        margin: 15mm 12mm;
      }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="report-header">
    <div>
      <div class="report-title">CPF Forecast Report</div>
      <div class="report-sub">Singapore CPF projection · 2026 official rates · Independent estimate</div>
    </div>
    <div class="report-meta">
      <strong>Generated ${reportDate}</strong>
      Age ${currentAge} today · ${rsLabel}<br>
      ${form.cpfPlan} CPF LIFE · Payout from age ${form.payoutStartAge} · To age ${form.planHorizon}
    </div>
  </div>

  <!-- Inputs summary -->
  <div class="section">
    <div class="section-title">Your inputs</div>
    <div class="inputs-grid">
      <div class="input-row"><span class="input-label">Date of birth</span><span class="input-val">${form.dob}</span></div>
      <div class="input-row"><span class="input-label">Status</span><span class="input-val">${form.scheme === 'SC_PR3' ? 'SC / PR 3yr+' : form.scheme === 'SPR2_GG' ? 'PR 2nd yr' : 'PR 1st yr'}</span></div>
      <div class="input-row"><span class="input-label">Monthly salary (OW)</span><span class="input-val">${fmt(form.monthlyOW)}</span></div>
      <div class="input-row"><span class="input-label">Annual bonus (AW)</span><span class="input-val">${fmt(form.annualAW)}</span></div>
      <div class="input-row"><span class="input-label">Salary growth</span><span class="input-val">${form.salaryGrowth}% p.a.</span></div>
      <div class="input-row"><span class="input-label">OA balance</span><span class="input-val">${fmt(form.balOA)}</span></div>
      <div class="input-row"><span class="input-label">SA balance</span><span class="input-val">${fmt(form.balSA)}</span></div>
      <div class="input-row"><span class="input-label">MA balance</span><span class="input-val">${fmt(form.balMA)}</span></div>
      <div class="input-row"><span class="input-label">OA interest rate</span><span class="input-val">${form.oaRate}%</span></div>
      <div class="input-row"><span class="input-label">SA/MA/RA rate</span><span class="input-val">${form.srmaRate}%</span></div>
      ${form.cpfisEnabled ? `
      <div class="input-row"><span class="input-label">CPFIS balance</span><span class="input-val">${fmt(form.cpfisBalance)}</span></div>
      <div class="input-row"><span class="input-label">CPFIS monthly contrib.</span><span class="input-val">${fmt(form.cpfisMonthlyContrib)}/mo</span></div>
      <div class="input-row"><span class="input-label">CPFIS expected return</span><span class="input-val">${form.cpfisAnnualReturn > 0 ? '+' : ''}${form.cpfisAnnualReturn}% p.a.</span></div>
      <div class="input-row"><span class="input-label">CPFIS stop age</span><span class="input-val">${form.cpfisStopAge}</span></div>
      ` : ''}
    </div>
  </div>

  <!-- KPI summary -->
  <div class="section">
    <div class="section-title">Key projections</div>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">${form.cpfisEnabled ? 'CPF + CPFIS at 55' : 'Total CPF at 55'}</div>
        <div class="kpi-val">${fmtK(form.cpfisEnabled ? summary.totalWithCpfisAt55 : summary.totalAt55)}</div>
        <div class="kpi-sub">${form.cpfisEnabled ? `CPF ${fmtK(summary.totalAt55)} + CPFIS ${fmtK(summary.cpfisAt55)}` : 'OA + SA + MA'}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">RA at age ${form.payoutStartAge}</div>
        <div class="kpi-val">${fmtK(summary.raAtPayoutStart)}</div>
        <div class="kpi-sub">Funds CPF LIFE annuity</div>
      </div>
      <div class="kpi hl">
        <div class="kpi-label">Monthly CPF LIFE (~est.)</div>
        <div class="kpi-val">${fmtK(summary.monthlyPayout)}/mo</div>
        <div class="kpi-sub">${form.cpfPlan} · from age ${form.payoutStartAge}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Lifetime payouts (~est.)</div>
        <div class="kpi-val">${fmtK(summary.lifetimePayouts)}</div>
        <div class="kpi-sub">Ages ${form.payoutStartAge}–${form.planHorizon}</div>
      </div>
    </div>
  </div>

  <!-- Age-55 breakdown -->
  ${t ? `
  <div class="section">
    <div class="section-title">At age 55 — what stays liquid, what's set aside</div>
    <div class="age55-card">
      <div class="age55-header">
        <span class="age55-badge">Age 55</span>
        <div>
          <div class="age55-title">CPF split at year ${t.year}</div>
          <div class="age55-sub">${rsLabel} · ${t.raAfter >= t.target - 1 ? 'Fully funded' : 'Partially funded'}</div>
        </div>
      </div>
      <div class="age55-blocks">
        <div class="age55-block">
          <div class="block-label">Set aside in RA (${form.rsTarget})</div>
          <div class="block-amt" style="color:#1D9E75">${fmtK(t.raAfter)}</div>
          <div class="block-sub">${t.raAfter >= t.target - 1 ? '✓ Target met' : '⚠ Shortfall vs ' + fmtK(t.target)}</div>
          <div style="font-size:7.5pt;color:#64748B">→ Funds CPF LIFE from age ${form.payoutStartAge}</div>
        </div>
        <div class="age55-block">
          <div class="block-label">Liquid cash (OA)</div>
          <div class="block-amt" style="color:#378ADD">${fmtK(liquidOA)}</div>
          <div class="block-sub">Freely withdrawable</div>
          <div class="interest-box">
            <div class="interest-row">
              <span class="interest-label">Monthly interest (2.5% p.a.)</span>
              <span class="interest-val">$${monthlyOAInterest.toLocaleString('en-SG')}/mo</span>
            </div>
            <div class="interest-row">
              <span class="interest-label">Annual interest</span>
              <span class="interest-val">$${annualOAInterest.toLocaleString('en-SG')}/yr</span>
            </div>
          </div>
        </div>
        <div class="age55-block">
          <div class="block-label">MediSave (MA)</div>
          <div class="block-amt" style="color:#BA7517">${fmtK(summary.annual.find(r => r.is55Event)?.ma ?? 0)}</div>
          <div class="block-sub">Healthcare use only</div>
          <div style="font-size:7.5pt;color:#94A3B8">Not withdrawable as cash</div>
        </div>
      </div>
    </div>
    <div style="font-size:8pt;color:#64748B;margin-top:-8px;margin-bottom:16px;line-height:1.5">
      How the RA was funded:
      SA transferred → RA: ${fmt(t.saToRa)}${t.oaToRa > 0 ? ` · OA drawn for shortfall: ${fmt(t.oaToRa)}` : ''}${t.saSurplus > 0 ? ` · SA surplus returned to OA: ${fmt(t.saSurplus)}` : ''}
    </div>
  </div>
  ` : ''}

  <!-- CPF LIFE plan comparison -->
  <div class="section">
    <div class="section-title">CPF LIFE plan comparison (from age ${form.payoutStartAge})</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Plan</th>
          <th>Monthly payout</th>
          <th>Growth</th>
          <th>Total to age ${form.planHorizon}</th>
        </tr>
      </thead>
      <tbody>${planRows}</tbody>
    </table>
    <div style="font-size:7.5pt;color:#94A3B8;margin-top:4px">★ = your selected plan · Payouts are estimates calibrated against CPF Board's published examples</div>
  </div>

  ${form.cpfisEnabled ? `
  <!-- CPFIS projection -->
  <div class="section">
    <div class="section-title">CPFIS projection (${form.cpfisAnnualReturn > 0 ? '+' : ''}${form.cpfisAnnualReturn}% p.a., stop age ${form.cpfisStopAge})</div>
    <div class="inputs-grid">
      <div class="input-row"><span class="input-label">Starting CPFIS value</span><span class="input-val">${fmt(form.cpfisBalance)}</span></div>
      <div class="input-row"><span class="input-label">Monthly contribution</span><span class="input-val">${fmt(form.cpfisMonthlyContrib)}/mo</span></div>
      <div class="input-row"><span class="input-label">Projected CPFIS at ${form.cpfisStopAge}</span><span class="input-val">${fmtK(summary.cpfisAt55)}</span></div>
      <div class="input-row"><span class="input-label">OA equivalent at ${form.cpfisStopAge} (2.5%)</span><span class="input-val">${fmtK(summary.cpfisEquivalentOaAt55)}</span></div>
    </div>
    <div style="font-size:7.5pt;color:#92400E;background:#FFFBEB;border:1px solid #FDE68A;border-radius:4px;padding:6px 8px;margin-top:6px">
      ⚠ CPFIS returns are not guaranteed. Past performance does not predict future results.
      CPF research found ~45% of investors made losses 2013–2022. Fees are not included in this projection.
    </div>
  </div>
  ` : ''}

  <!-- Year-by-year table -->
  <div class="section">
    <div class="section-title">Year-by-year projection</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Year</th>
          <th style="text-align:center">Phase</th>
          <th style="text-align:center">Age</th>
          <th>OA</th>
          <th>SA / RA</th>
          <th>MA</th>
          ${form.cpfisEnabled ? '<th>CPFIS</th>' : ''}
          <th>Total</th>
          <th>CPF LIFE (cumul.)</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <!-- Disclaimer -->
  <div class="disclaimer">
    <strong>Important disclaimer:</strong> This report was generated by an independent, unofficial tool and is not affiliated with, endorsed by, or verified by the CPF Board.
    Figures are estimates based on the developer's interpretation of publicly available CPF rules effective 1 January 2026, and may contain errors or omissions.
    CPF policies, rates, and retirement sums are subject to change. CPF LIFE payout figures are approximations; the exact actuarial formula is not publicly disclosed.
    This report does not constitute financial, tax, or retirement planning advice. Always verify using official CPF Board resources at cpf.gov.sg before making any financial decisions.
    Use at your own risk. The developer accepts no liability for any loss or decision made in reliance on this report.
  </div>

</div>

<script>
  // Auto-trigger print dialog when the window loads
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 400);
  });
</script>
</body>
</html>`;

  // Open in a new window and trigger print
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Please allow pop-ups for this site to download the PDF report.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
