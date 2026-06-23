/* Outer wrapper: horizontal scroll on mobile, vertical scroll always */
.wrap {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 440px;
  -webkit-overflow-scrolling: touch;
  /* Subtle shadow cue that table scrolls horizontally */
  background:
    linear-gradient(to right, white 30%, rgba(255,255,255,0)),
    linear-gradient(to left,  white 30%, rgba(255,255,255,0)) 100% 0,
    radial-gradient(farthest-side at 0   50%, rgba(0,0,0,.08), transparent),
    radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,.08), transparent) 100% 0;
  background-repeat: no-repeat;
  background-color: white;
  background-size: 40px 100%, 40px 100%, 14px 100%, 14px 100%;
  background-attachment: local, local, scroll, scroll;
}

.table {
  border-collapse: collapse;
  font-size: 11px;
  /* Let the table be as wide as its content needs — don't squish */
  width: 100%;
  min-width: 480px;
  table-layout: auto;
}

th {
  position: sticky; top: 0; z-index: 1;
  font-size: 10px; font-weight: 600; letter-spacing: .4px;
  color: var(--slate-400); text-transform: uppercase;
  padding: 7px 8px; text-align: right;
  background: white; border-bottom: 1px solid var(--slate-200);
  white-space: nowrap;
}
.left { text-align: left !important; }

td {
  padding: 4px 8px; text-align: right;
  font-family: var(--font-mono); color: var(--slate-600);
  border-bottom: 1px solid var(--slate-100);
  white-space: nowrap;
  font-size: 11px;
}
/* First column: year + pill badge */
td.left {
  font-family: var(--font-sans);
  text-align: left;
  color: var(--slate-800);
  min-width: 110px;
}

.milestone td { background: #F0FBF7; }
.milestone td.left { color: var(--teal); font-weight: 600; }

tr:hover td { background: var(--slate-50); }
.milestone:hover td { background: #DCF5EB; }

.year { font-family: var(--font-sans); font-size: 12px; font-weight: 500; }

.pill {
  font-size: 9px; padding: 1px 5px; border-radius: 8px;
  margin-left: 4px; vertical-align: middle;
  font-family: var(--font-sans); font-weight: 500;
}
.pillAcc  { background: var(--teal-light);  color: var(--teal-deep); }
.pillPost { background: var(--blue-light);  color: #185FA5; }
.pillPay  { background: var(--amber-light); color: #633806; }

.bold   { font-weight: 600; color: var(--slate-800); }
.payout { color: var(--teal); font-weight: 500; }
.dash   { color: var(--slate-300); }

/* Mobile: tighten padding further but keep horizontal scroll */
@media (max-width: 700px) {
  .table { font-size: 11px; min-width: 440px; }
  th { padding: 6px 7px; font-size: 9px; }
  td { padding: 4px 7px; font-size: 11px; }
}
