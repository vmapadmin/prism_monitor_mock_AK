'use strict';
const PORT = { borrowers: 428, due: 396, received: 348, overdue: 48, review: 15, excOpen: 67, awaitRM: 21, sla: 9, ready: 7, approval: 16, dpReduced: 27, limitPending: 13, completed: 276, reduction: 18.72, tat: 1.8 };
const EXC_CATS = [['Debtor ageing', 23], ['Arithmetic error', 19], ['Missing signature', 14], ['Ineligible stock', 11], ['Creditor difference', 9], ['CAM/DN variance', 8], ['Missing information', 7], ['Missing stamp', 6], ['Missing declaration', 5], ['Outstanding mismatch', 4]];
const PORT_TREND = { gs: [1912, 1936, 1958, 1990, 2012, 2031, 2018, 1996, 2004, 1978, 1951, 1928], es: [1782, 1801, 1822, 1851, 1869, 1886, 1874, 1851, 1858, 1832, 1806, 1781], er: [948, 962, 975, 990, 1002, 1011, 1003, 991, 986, 972, 957, 941],
  dp: [1622, 1641, 1660, 1686, 1703, 1717, 1706, 1688, 1690, 1668, 1646, 1624], sl: [2086, 2092, 2098, 2104, 2110, 2118, 2124, 2128, 2132, 2136, 2140, 2142], ol: [1541, 1558, 1575, 1597, 1612, 1624, 1616, 1601, 1604, 1586, 1567, 1549] };
const pageHead = (t, s, right = '') => `<div class="ph"><div><h1>${t}</h1>${s ? `<p class="muted">${s}</p>` : ''}</div><div class="acts">${right}</div></div>`;

/* ---------- Executive overview ---------- */
function vOverview(){
  const P = PORT;
  const kpis = [['Total borrowers monitored', P.borrowers, ''], ['Statements due', P.due, 'Aug 2026'], ['Received', P.received, pct(P.received / P.due * 100, 0) + ' of due'], ['Overdue', P.overdue, 'past 20-Sep', 'warn'], ['Under review', P.review, ''], ['Exceptions open', P.excOpen, 'across ' + (P.review + P.awaitRM) + ' statements', 'warn'],
    ['Awaiting RM', P.awaitRM, ''], ['SLA breaches', P.sla, 'RM & TAT', 'crit'], ['Ready for DP', P.ready, ''], ['Awaiting approval', P.approval, ''], ['DP reduced', P.dpReduced, 'borrowers', 'warn'], ['Limit updates pending', P.limitPending, ''], ['Completed', P.completed, pct(P.completed / P.received * 100, 0) + ' of received', 'ok']];
  const T = PORT_TREND, toR = a => a.map(v => L(v * 100));
  const cases = ST.cases.filter(c => c.received);
  const risk = riskViews();
  return pageHead('Executive overview', 'Stock statement monitoring · Aug 2026 cycle · as of ' + fmtDT(SIM_NOW), `<button class="btn primary" onclick="A.go({page:'case',id:'SS-2026-000348'})">${icon('play', 14)} Start golden path: Apex Auto Components</button>`) +
  `<div class="kpis">${kpis.map(([l, v, s, t]) => `<div class="kpi ${t || ''}"><span>${l}</span><b class="num">${v}</b>${s ? `<em>${s}</em>` : ''}</div>`).join('')}
    <div class="kpi hero"><span>Potential limit reduction</span><b class="num">₹${P.reduction} Cr</b><em>across ${P.dpReduced} borrowers</em></div><div class="kpi hero"><span>Average turnaround</span><b class="num">${P.tat} days</b><em>receipt to limit update</em></div></div>
  <div class="grid2">
    <div class="card"><div class="card-h"><h3>Statement status funnel</h3><span class="fine muted">Conversion from previous stage</span></div>${funnel([{ l: 'Due', v: 396 }, { l: 'Received', v: 348 }, { l: 'Validated', v: 331 }, { l: 'Exceptions cleared', v: 312 }, { l: 'DP calculated', v: 305 }, { l: 'Approved', v: 289 }, { l: 'Limit updated', v: 276 }])}</div>
    <div class="card"><div class="card-h"><h3>Exceptions raised by category</h3><span class="fine muted">${sum(EXC_CATS.map(x => x[1]))} this cycle · ${P.excOpen} open</span></div>${hBars(EXC_CATS.map(([l, v]) => ({ l, v, onclick: "A.go({page:'exceptions'})" })))}</div>
  </div>
  <div class="card"><div class="card-h"><h3>Portfolio drawing power trend</h3><span class="fine muted">₹ Cr, all monitored borrowers</span></div>${lineChart({ labels: HMONTHS, fmt: v => '₹' + Math.round(v / 1e7).toLocaleString('en-IN'), series: [
    { name: 'Sanctioned limit', values: toR(T.sl), color: 'var(--c-grey)', dash: true }, { name: 'Gross stock', values: toR(T.gs), color: 'var(--c-slate)' }, { name: 'Eligible stock', values: toR(T.es), color: 'var(--c-blue)' },
    { name: 'Calculated DP', values: toR(T.dp), color: 'var(--navy-accent)', w: 3 }, { name: 'Operative limit', values: toR(T.ol), color: 'var(--teal)' }, { name: 'Eligible receivables', values: toR(T.er), color: 'var(--amber)' }] })}</div>
  <div class="grid2">
    <div class="card"><div class="card-h"><h3>Portfolio risk views</h3><span class="fine muted">Demo borrowers · observable trends</span></div><div class="risk-grid">${risk.map(r => `<div class="rk"><div class="rk-h"><b class="num">${r.list.length}</b><span>${r.l}</span></div><div class="rk-l">${r.list.slice(0, 3).map(c => `<a href="#" onclick="A.go({page:'borrower',id:'${c.bId}'});return false">${esc(c.bor.short)}</a>`).join('') || '<span class="muted fine">None</span>'}</div></div>`).join('')}</div></div>
    <div class="card"><div class="card-h"><h3>Cases in flight</h3><a href="#" onclick="A.go({page:'queue'});return false" class="fine">Open work queue</a></div>
      <table class="tbl compact"><tbody>${cases.slice(0, 8).map(c => `<tr onclick="A.go({page:'case',id:'${c.id}'})" class="click"><td><b>${esc(c.bor.short)}</b><div class="fine muted">${esc(c.scenario)}</div></td><td>${badge(caseStatus(c))}</td><td class="r num">${cr(CRE.calculateDP(c).change)}</td></tr>`).join('')}</tbody></table></div>
  </div>
  <div class="diff"><h3>More than document extraction</h3><div class="diff-row">${[['Document intelligence', 'Reads, classifies and checks every page'], ['Credit rule intelligence', 'Applies CAM/DN terms deterministically'], ['Workflow', 'Routes exceptions, RM clarifications and maker-checker'], ['Drawing power automation', 'Explainable DP through to core banking'], ['Portfolio monitoring', 'Trends and early signals across the book']].map(([a, b], i) => `<div><b>${a}</b><span>${b}</span></div>${i < 4 ? '<i>+</i>' : ''}`).join('')}</div></div>`;
}
function riskViews(){
  const cs = ST.cases.filter(c => c.received);
  const H = c => histOf(c), n = 12;
  return [
    { l: 'Falling DP (MoM)', list: cs.filter(c => H(c)[n - 1].dp < H(c)[n - 2].dp) },
    { l: 'Inventory down >10% MoM', list: cs.filter(c => (H(c)[n - 1].stock - H(c)[n - 2].stock) / H(c)[n - 2].stock < -0.10) },
    { l: 'Rising overdue debtors', list: cs.filter(c => H(c)[n - 1].over / H(c)[n - 1].rec > H(c)[n - 4].over / H(c)[n - 4].rec + 0.02) },
    { l: 'Increasing creditors', list: cs.filter(c => H(c)[n - 1].cred > H(c)[n - 4].cred * 1.08) },
    { l: 'Repeated exceptions', list: cs.filter(c => H(c).slice(n - 4).filter(x => x.exc > 0).length >= 3) },
    { l: 'Delayed submissions', list: ST.cases.filter(c => !c.received || H(c).some(x => x.delay >= 7)) },
    { l: 'DP below outstanding', list: cs.filter(c => CRE.calculateDP(c).shortfall > 0) },
    { l: 'Consecutive DP deterioration', list: cs.filter(c => [n - 1, n - 2, n - 3].every(i => H(c)[i].dp < H(c)[i - 1].dp)) },
  ];
}

/* ---------- My work ---------- */
function workItems(role){
  const cs = ST.cases, it = [];
  if (role === 'analyst') cs.forEach(c => { const s = caseStatus(c); if (['Validation Review', 'Exception Review', 'RM Responded', 'Credit Review', 'Ready for DP'].includes(s)) it.push({ c, s, t: nextAction(c).t, tab: s === 'Validation Review' ? 'docs' : s === 'Ready for DP' || s === 'Credit Review' ? 'dp' : 'exceptions' }); });
  if (role === 'rm') cs.forEach(c => { if (ST.rmIdentity !== 'All' && c.bor.rm !== ST.rmIdentity) return; c.excs.filter(e => e.status === 'Sent to RM').forEach(e => it.push({ c, s: 'Awaiting RM', t: e.id + ' · ' + e.title, tab: 'exceptions', ex: e.id, due: e.dueAt })); });
  if (role === 'checker') cs.forEach(c => { if (caseStatus(c) === 'Awaiting Approval') it.push({ c, s: 'Awaiting Approval', t: 'DP ' + cr(c.submission.dp) + ' submitted by ' + c.submission.by, tab: 'approval' }); });
  if (role === 'ops') cs.forEach(c => { const s = caseStatus(c); if (['Limit Update Pending', 'Limit Update Failed'].includes(s)) it.push({ c, s, t: 'New operative limit ' + cr(CRE.calculateDP(c).recommended), tab: 'limit' }); });
  if (role === 'risk') cs.forEach(c => { if (!c.received) it.push({ c, s: 'Not Received', t: 'Statement overdue ' + dur(SIM_NOW - c.dueDate), tab: 'overview' }); else { const sl = caseSLA(c); if (sl.s === 'Breached') it.push({ c, s: caseStatus(c), t: sl.t, tab: 'exceptions' }); } });
  return it;
}
function vWork(){
  const r = ST.role, items = workItems(r);
  const rmSel = r === 'rm' ? `<label class="fine">Viewing as RM <select onchange="A.rmId(this.value)">${['All', ...RMS].map(x => `<option ${x === ST.rmIdentity ? 'selected' : ''}>${x}</option>`).join('')}</select></label>` : '';
  let extra = '';
  if (r === 'risk') extra = `<div class="card"><h3>Monitoring insights needing attention</h3>${ST.cases.filter(c => c.received).map(c => ({ c, i: ewsInsights(c) })).filter(x => x.i.some(y => y.sev === 'high')).map(x => `<div class="ews-row"><a href="#" onclick="A.go({page:'borrower',id:'${x.c.bId}'});return false"><b>${esc(x.c.bor.name)}</b></a>${x.i.filter(y => y.sev === 'high').map(y => `<span class="fine">${esc(y.t)}</span>`).join('')}</div>`).join('')}</div>`;
  if (r === 'admin') extra = `<div class="card"><h3>Configuration</h3><p class="muted">No pending configuration requests.</p><div class="acts"><button class="btn" onclick="A.go({page:'rules'})">Rules & configuration</button><button class="btn" onclick="A.go({page:'admin'})">Users & roles</button></div></div>`;
  if (r === 'auditor') extra = `<div class="card flush"><div class="card-h"><h3>Latest audit events</h3><a href="#" class="fine" onclick="A.go({page:'audit'});return false">Full audit trail</a></div>${auditTable(ST.audit.slice().sort((a, b) => b.ts - a.ts).slice(0, 12))}</div>`;
  return pageHead('My work', ROLES[r].title + ' · ' + (r === 'rm' ? ST.rmIdentity === 'All' ? 'all RM desks (demo)' : ST.rmIdentity : ROLES[r].name), rmSel) +
    (['admin', 'auditor'].includes(r) ? '' : `<div class="card flush">${items.length ? `<table class="tbl"><thead><tr><th>Borrower</th><th>Case</th><th>Task</th><th>Status</th><th>SLA</th><th></th></tr></thead><tbody>${items.map(i => { const sl = i.due ? { s: i.due < SIM_NOW ? 'Breached' : i.due - SIM_NOW < 4 * HR ? 'Warning' : 'On track', t: i.due < SIM_NOW ? 'Breached ' + dur(SIM_NOW - i.due) : 'Due in ' + hm(i.due - SIM_NOW) } : caseSLA(i.c);
      return `<tr class="click" onclick="A.go({page:'case',id:'${i.c.id}',tab:'${i.tab}'${i.ex ? `,ex:'${i.ex}'` : ''}})"><td><b>${esc(i.c.bor.name)}</b><div class="fine muted">${esc(i.c.bor.branch)}</div></td><td>${i.c.id}</td><td>${esc(i.t)}</td><td>${badge(i.s)}</td><td><span class="sla sla-${sl.s.replace(' ', '')}">${esc(sl.t)}</span></td><td><button class="btn sm">Open</button></td></tr>`; }).join('')}</tbody></table>` : emptyState('Nothing waiting for you', 'New tasks appear here as cases reach your stage.', `<button class="btn" onclick="A.go({page:'queue'})">Browse all statements</button>`)}</div>`) + extra;
}

/* ---------- Queue ---------- */
function queueRows(){
  const f = ST.ui.qf, q = (f.q || '').toLowerCase();
  let rows = ST.cases.filter(c => {
    const s = caseStatus(c), sl = caseSLA(c).s;
    if (q && !(c.bor.name + ' ' + c.id + ' ' + c.bor.cust + ' ' + c.bor.rm + ' ' + c.bor.branch + ' ' + c.bor.acct).toLowerCase().includes(q)) return false;
    if (f.seg && c.bor.seg !== f.seg) return false; if (f.branch && c.bor.branch !== f.branch) return false; if (f.rm && c.bor.rm !== f.rm) return false;
    if (f.status && s !== f.status) return false; if (f.exc === 'open' && !openExcs(c).length) return false; if (f.exc === 'none' && c.excs.length) return false;
    if (f.sla && sl !== f.sla) return false; return true;
  });
  const sort = f.sort || 'received', dir = f.dir || -1;
  const key = c => sort === 'borrower' ? c.bor.name : sort === 'exceptions' ? openExcs(c).length : sort === 'impact' ? (c.received ? CRE.calculateDP(c).change : 0) : sort === 'conf' ? (c.received ? DocumentIntelligenceService.calculateConfidence(c) : 0) : (c.receivedAt || 0);
  rows.sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * dir);
  return rows;
}
function queueBody(){
  const rows = queueRows();
  if (!rows.length) return `<tr><td colspan="16">${emptyState('No statements match', 'Clear a filter to see more cases.', `<button class="btn sm" onclick="A.qReset()">Clear filters</button>`)}</td></tr>`;
  return rows.map(c => { const s = caseStatus(c), sl = caseSLA(c), k = c.received ? CRE.calculateDP(c) : null, conf = c.received ? DocumentIntelligenceService.calculateConfidence(c) : null, oe = openExcs(c).length;
    return `<tr class="click" onclick="A.go({page:'case',id:'${c.id}'})"><td class="nowrap">${c.id}</td><td><b>${esc(c.bor.name)}</b><div class="fine muted">${esc(c.scenario)}</div></td><td>${c.bor.cust}</td><td>${c.cam.facility}</td><td>${esc(c.bor.rm)}</td><td>${esc(c.bor.branch)}</td><td>${c.bor.seg}</td><td>${c.month}</td>
      <td class="nowrap">${c.received ? fmtD(c.receivedAt) : '—'}</td><td class="r num">${c.received ? (c.pages.some(p => p.span) ? c.pages[c.pages.length - 1].span[1] : c.pages.length) : '—'}</td><td>${conf != null ? confPill(conf) : '—'}</td>
      <td class="r num">${c.received ? `${oe}<span class="muted">/${c.excs.length}</span>` : '—'}</td><td><span class="sla sla-${sl.s.replace(' ', '')}">${esc(sl.t)}</span></td><td>${STAGES[Math.max(0, stageIdx(s))]}</td>
      <td class="r num ${k && k.change < 0 ? 'neg' : ''}">${k ? (k.change >= 0 ? '+' : '') + cr(k.change) : '—'}</td><td>${badge(s)}</td><td><button class="btn sm" onclick="event.stopPropagation();${c.received ? `A.go({page:'case',id:'${c.id}'})` : `A.upload('${c.bId}')`}">${c.received ? 'Open' : 'Upload'}</button></td></tr>`; }).join('');
}
function vQueue(){
  const f = ST.ui.qf, uniq = a => [...new Set(a)].sort();
  const sel = (k, label, opts) => `<select onchange="A.qf('${k}',this.value)" aria-label="${label}"><option value="">${label}</option>${opts.map(o => `<option ${f[k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  const th = (k, l, cls = '') => `<th class="${cls} sortable" onclick="A.qSort('${k}')">${l}${f.sort === k ? (f.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`;
  return pageHead('Stock statement work queue', ST.cases.length + ' demo cases · ' + PORT.received + ' received portfolio-wide this cycle', `<button class="btn primary" onclick="A.upload()">${icon('upload', 14)} Upload stock statement</button>`) +
  `<div class="filters"><div class="search-in">${icon('search', 14)}<input id="q-in" placeholder="Search borrower, case, customer ID, RM, branch" value="${esc(f.q || '')}" oninput="A.qf('q',this.value,true)"></div>
    ${sel('seg', 'All segments', ['SME', 'Mid Corporate'])}${sel('branch', 'All branches', uniq(BORROWERS.map(b => b.branch)))}${sel('rm', 'All RMs', uniq(BORROWERS.map(b => b.rm)))}
    ${sel('status', 'All statuses', Object.keys(STATUS_CLS).slice(0, 12).concat(['Limit Update Failed']).filter((v, i, a) => a.indexOf(v) === i && !['Received', 'Approved'].includes(v)))}
    <select onchange="A.qf('exc',this.value)" aria-label="Exceptions"><option value="">Any exceptions</option><option value="open" ${f.exc === 'open' ? 'selected' : ''}>Open exceptions</option><option value="none" ${f.exc === 'none' ? 'selected' : ''}>No exceptions</option></select>
    ${sel('sla', 'Any SLA', ['On track', 'Warning', 'Breached'])}${Object.values(f).some(v => v && v !== f.sort && v !== f.dir) ? `<button class="btn sm ghost" onclick="A.qReset()">Clear</button>` : ''}</div>
  <div class="card flush"><div class="tscroll"><table class="tbl queue"><thead><tr>${th('id', 'Case ID')}${th('borrower', 'Borrower')}<th>Customer ID</th><th>Facility</th><th>RM</th><th>Branch</th><th>Segment</th><th>Month</th>${th('received', 'Received')}<th class="r">Pages</th>${th('conf', 'Confidence')}${th('exceptions', 'Exceptions', 'r')}<th>SLA</th><th>Stage</th>${th('impact', 'DP impact', 'r')}<th>Status</th><th></th></tr></thead><tbody id="q-body">${queueBody()}</tbody></table></div></div>`;
}

/* ---------- Borrowers ---------- */
function vBorrowers(){
  return pageHead('Borrowers', BORROWERS.length + ' demo borrowers of ' + PORT.borrowers + ' monitored') + `<div class="card flush"><div class="tscroll"><table class="tbl"><thead><tr><th>Borrower</th><th>Customer ID</th><th>Segment</th><th>Industry</th><th>Branch</th><th>RM</th><th>Rating</th><th class="r">Sanction</th><th class="r">Latest DP</th><th>DP trend</th><th>Signals</th></tr></thead><tbody>
  ${BORROWERS.map(b => { const c = caseByB(b.id), h = histOf(c), ins = c.received ? ewsInsights(c) : [];
    return `<tr class="click" onclick="A.go({page:'borrower',id:'${b.id}'})"><td><b>${esc(b.name)}</b></td><td>${b.cust}</td><td>${b.seg}</td><td>${esc(b.ind)}</td><td>${esc(b.branch)}</td><td>${esc(b.rm)}</td><td>${b.rating}</td><td class="r num">${cr(c.sanction)}</td><td class="r num">${cr(c.received ? h[11].op : h[10].op)}</td><td>${spark(h.map(x => x.dp), h[11].dp < h[8].dp ? 'var(--red)' : 'var(--teal)')}</td><td>${ins.length ? `<span class="badge b-${ins.some(i => i.sev === 'high') ? 'red' : 'amber'}">${ins.length} signal${ins.length > 1 ? 's' : ''}</span>` : c.received ? '<span class="muted fine">None</span>' : badge('Not Received')}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}
function ewsCards(c, compact = false){
  if (!c.received) return '<p class="muted">Statement not yet received.</p>';
  const ins = ewsInsights(c);
  if (!ins.length) return `<div class="okline">${icon('checkc')} No adverse trends observed across the last 12 statements.</div>`;
  return `<div class="ews ${compact ? 'compact' : ''}">${ins.map(i => `<div class="ews-card s-${i.sev}"><span class="ews-tag">Prism Intelligence — Monitoring insight</span><b>${esc(i.k)}</b><p>${esc(i.t)}</p></div>`).join('')}</div>${compact ? '' : '<p class="fine muted">Observations of reported trends only. They do not indicate or predict default.</p>'}`;
}
function vBorrower(){
  const b = B(ST.route.id), c = caseByB(b.id), h = histOf(c), last = c.received ? h[11] : h[10];
  const util = x => x.os / x.op * 100;
  const tl = ST.audit.filter(a => a.caseId === c.id && a.milestone).sort((x, y) => x.ts - y.ts);
  return `<div class="crumbs"><a href="#" onclick="A.go({page:'borrowers'});return false">Borrowers</a>${icon('chev', 12)}<span>${esc(b.name)}</span></div>` +
  `<div class="b360-h card"><div><h1>${esc(b.name)}</h1><div class="ch-meta"><span>${esc(b.ind)}</span><span>${esc(b.branch)}</span><span>RM ${esc(b.rm)}</span><span>${b.cust}</span><span>Rating ${b.rating}</span></div></div>
    <div class="ch-figs"><div><span>Sanction</span><b class="num">${cr(c.sanction)}</b></div><div><span>Outstanding</span><b class="num">${cr(c.cbsOutstanding)}</b></div><div><span>Latest DP</span><b class="num">${cr(last.dp)}</b></div><div><span>Operative limit</span><b class="num">${cr(last.op)}</b></div><div><span>Utilisation</span><b class="num">${pct(util({ os: c.cbsOutstanding, op: last.op }), 0)}</b></div></div>
    <div class="acts"><button class="btn primary" onclick="A.go({page:'case',id:'${c.id}'})">Open ${c.month} case</button><button class="btn" onclick="A.report('${c.id}','trend')">Monthly trend report</button></div></div>
  <div class="card"><h3>Early-warning observations</h3>${ewsCards(c)}</div>
  <div class="grid2">
    <div class="card"><h3>Stock, receivables and creditors</h3>${lineChart({ labels: HMONTHS, series: [{ name: 'Gross stock', values: h.map(x => x.stock), color: 'var(--c-blue)' }, { name: 'Receivables', values: h.map(x => x.rec), color: 'var(--amber)' }, { name: 'Creditors', values: h.map(x => x.cred), color: 'var(--c-slate)' }] })}</div>
    <div class="card"><h3>DP, sanction and operative limit</h3>${lineChart({ labels: HMONTHS, series: [{ name: 'Sanctioned limit', values: h.map(x => x.sanction), color: 'var(--c-grey)', dash: true }, { name: 'Calculated DP', values: h.map(x => x.dp), color: 'var(--navy-accent)', w: 3 }, { name: 'Operative limit', values: h.map(x => x.op), color: 'var(--teal)' }] })}</div>
  </div>
  <div class="grid2">
    <div class="card"><h3>Utilisation</h3>${lineChart({ labels: HMONTHS, fmt: v => v.toFixed(0) + '%', series: [{ name: 'Utilisation of operative limit', values: h.map(x => util(x)), color: 'var(--primary)' }] })}</div>
    <div class="card"><h3>Current case timeline</h3>${tl.length ? `<ol class="chron">${tl.map(e => `<li class="done"><b>${esc(e.milestone)}</b><span class="fine muted">${fmtDT(e.ts)} · ${esc(e.user)}</span></li>`).join('')}</ol>` : '<p class="muted">No activity yet.</p>'}</div>
  </div>
  <div class="card flush"><div class="card-h"><h3>Monthly statement history</h3></div><div class="tscroll"><table class="tbl"><thead><tr><th>Month</th><th class="r">Gross stock</th><th class="r">Eligible stock</th><th class="r">Creditors</th><th class="r">Receivables</th><th class="r">Ineligible debtors</th><th class="r">Calculated DP</th><th class="r">Operative limit</th><th class="r">Exceptions</th><th class="r">Days late</th></tr></thead><tbody>
  ${h.slice().reverse().map(x => `<tr class="${x.current ? 'hi' : ''}"><td>${x.m}${x.current ? ' <span class="tag">current</span>' : ''}</td><td class="r num">${cr(x.stock)}</td><td class="r num">${cr(x.elS)}</td><td class="r num">${cr(x.cred)}</td><td class="r num">${cr(x.rec)}</td><td class="r num">${cr(x.over)}</td><td class="r num">${cr(x.dp)}</td><td class="r num">${cr(x.op)}</td><td class="r num">${x.exc}</td><td class="r num">${x.delay || '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
}

/* ---------- Exceptions (portfolio) ---------- */
function vExceptions(){
  const f = ST.ui.ef;
  const all = ST.cases.flatMap(c => c.excs.map(e => ({ c, e }))).filter(({ e }) => (!f.sev || e.sev === f.sev) && (!f.status || e.status === f.status) && (!f.cat || e.cat === f.cat));
  const cats = [...new Set(ST.cases.flatMap(c => c.excs.map(e => e.cat)))].sort();
  const sel = (k, l, o) => `<select onchange="A.ef('${k}',this.value)"><option value="">${l}</option>${o.map(x => `<option ${f[k] === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
  return pageHead('Exceptions', all.length + ' exceptions on demo cases') + `<div class="filters">${sel('sev', 'All severities', ['Critical', 'High', 'Medium', 'Low'])}${sel('status', 'All statuses', ['Open', 'Sent to RM', 'RM Responded', 'Resolved', 'Auto-cleared'])}${sel('cat', 'All categories', cats)}</div>
  <div class="card flush"><div class="tscroll"><table class="tbl"><thead><tr><th>Exception ID</th><th>Borrower</th><th>Category</th><th>Severity</th><th>Description</th><th>Customer value</th><th>System value</th><th class="r">DP impact</th><th>RM action</th><th>SLA</th><th>Status</th></tr></thead><tbody>
  ${all.map(({ c, e }) => { const v = exView(c, e), sl = e.status === 'Sent to RM' ? (e.dueAt < SIM_NOW ? 'Breached ' + dur(SIM_NOW - e.dueAt) : 'Due in ' + hm(e.dueAt - SIM_NOW)) : '—';
    return `<tr class="click" onclick="A.go({page:'case',id:'${c.id}',tab:'exceptions',ex:'${e.id}'})"><td class="nowrap">${e.id}</td><td>${esc(c.bor.short)}</td><td>${e.cat}</td><td>${sevDot(e.sev)} ${e.sev}</td><td>${esc(e.title)}</td><td class="fine">${esc(v.cust)}</td><td class="fine">${esc(v.sys)}</td><td class="r num">${v.impact ? amt(v.impact) : '—'}</td><td>${e.rmReq ? 'Yes' : 'No'}</td><td class="fine ${e.dueAt && e.dueAt < SIM_NOW && e.status === 'Sent to RM' ? 'neg' : ''}">${sl}</td><td>${badge(e.status)}</td></tr>`; }).join('') || `<tr><td colspan="11">${emptyState('No exceptions match', 'Try another filter.')}</td></tr>`}</tbody></table></div></div>`;
}

/* ---------- DP / approvals / limits ---------- */
function vDP(){
  const cs = ST.cases.filter(c => c.received);
  return pageHead('Drawing power', 'Calculated by the deterministic credit rule engine') + `<div class="card flush"><div class="tscroll"><table class="tbl"><thead><tr><th>Borrower</th><th>Case</th><th class="r">Stock DP</th><th class="r">Receivable DP</th><th class="r">Calculated DP</th><th class="r">Sanction</th><th class="r">Existing limit</th><th class="r">Recommended</th><th class="r">Change</th><th>Status</th></tr></thead><tbody>
  ${cs.map(c => { const k = CRE.calculateDP(c); return `<tr class="click" onclick="A.go({page:'case',id:'${c.id}',tab:'dp'})"><td><b>${esc(c.bor.name)}</b></td><td>${c.id}</td><td class="r num">${cr(k.stockDP)}</td><td class="r num">${cr(k.recDP)}</td><td class="r num">${cr(k.calculatedDP)}</td><td class="r num">${cr(k.sanction)}</td><td class="r num">${cr(k.existing)}</td><td class="r num"><b>${cr(k.recommended)}</b></td><td class="r num ${k.change < 0 ? 'neg' : 'pos'}">${k.change >= 0 ? '+' : ''}${cr(k.change)}</td><td>${badge(caseStatus(c))}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}
function vApprovals(){
  const pend = ST.cases.filter(c => caseStatus(c) === 'Awaiting Approval'), done = ST.cases.filter(c => c.approval || (c.approvals || []).length);
  const row = c => { const k = CRE.calculateDP(c), lv = approvalLevel(Math.abs(k.change)); return `<tr class="click" onclick="A.go({page:'case',id:'${c.id}',tab:'approval'})"><td><b>${esc(c.bor.name)}</b></td><td>${c.id}</td><td class="r num">${cr(c.operative)}</td><td class="r num">${cr(k.recommended)}</td><td class="r num ${k.change < 0 ? 'neg' : 'pos'}">${cr(k.change)}</td><td>${lv.level} · ${esc(lv.who)}</td><td>${esc(c.submission?.by || '—')}</td><td>${c.approval ? esc(c.approval.decision + ' · ' + fmtDTs(c.approval.ts)) : c.submission ? fmtDTs(c.submission.ts) : '—'}</td><td>${badge(caseStatus(c))}</td></tr>`; };
  const hd = '<thead><tr><th>Borrower</th><th>Case</th><th class="r">Existing</th><th class="r">Recommended</th><th class="r">Change</th><th>Authority</th><th>Maker</th><th>Submitted / decided</th><th>Status</th></tr></thead>';
  return pageHead('Approvals', 'Maker-checker queue') + `<div class="card flush"><div class="card-h"><h3>Awaiting approval</h3></div>${pend.length ? `<table class="tbl">${hd}<tbody>${pend.map(row).join('')}</tbody></table>` : emptyState('No cases awaiting approval', 'Cases appear here when a credit analyst submits drawing power.')}</div>
    <div class="card flush"><div class="card-h"><h3>Decided</h3></div><table class="tbl">${hd}<tbody>${done.map(row).join('') || '<tr><td colspan="9" class="muted">None</td></tr>'}</tbody></table></div>
    <div class="card"><h3>Approval authority</h3><table class="tbl"><thead><tr><th>Level</th><th>Authority</th><th>Limit change</th></tr></thead><tbody><tr><td>L1</td><td>Credit Manager</td><td>Up to ₹1 Cr</td></tr><tr><td>L2</td><td>AGM – Credit</td><td>₹1 Cr – ₹5 Cr</td></tr><tr><td>L3</td><td>DGM – Credit</td><td>Above ₹5 Cr</td></tr></tbody></table></div>`;
}
function vLimits(){
  const cs = ST.cases.filter(c => c.approval?.decision === 'Approved');
  return pageHead('Limit updates', 'Approved DP changes for core banking') + `<div class="card flush"><table class="tbl"><thead><tr><th>Borrower</th><th>Case</th><th>Account</th><th class="r">Current limit</th><th class="r">New limit</th><th>Effective</th><th>Core banking ref</th><th>Status</th></tr></thead><tbody>
  ${cs.map(c => { const k = CRE.calculateDP(c); return `<tr class="click" onclick="A.go({page:'case',id:'${c.id}',tab:'limit'})"><td><b>${esc(c.bor.name)}</b></td><td>${c.id}</td><td>${c.bor.acct}</td><td class="r num">${cr(c.operative)}</td><td class="r num">${cr(k.recommended)}</td><td>30-Sep-2026</td><td>${c.limit?.ref || '—'}</td><td>${badge(caseStatus(c))}</td></tr>`; }).join('') || `<tr><td colspan="8">${emptyState('No approved changes yet', 'Approved drawing power changes queue here for operations.')}</td></tr>`}</tbody></table></div>`;
}

/* ---------- Monitoring ---------- */
function vMonitoring(){
  const cs = ST.cases.filter(c => c.received);
  const rv = riskViews();
  const slaEx = ST.cases.flatMap(c => c.excs.filter(e => e.status === 'Sent to RM').map(e => ({ c, e }))).sort((a, b) => a.e.dueAt - b.e.dueAt);
  return pageHead('Credit monitoring', 'Early-warning observations, overdue statements and SLA') +
  `<div class="risk-strip">${rv.map(r => `<div><b class="num">${r.list.length}</b><span>${r.l}</span></div>`).join('')}</div>
  <div class="grid2"><div class="card"><h3>Overdue statements</h3>${ST.cases.filter(c => !c.received).map(c => `<div class="ews-row"><a href="#" onclick="A.go({page:'case',id:'${c.id}'});return false"><b>${esc(c.bor.name)}</b></a><span class="fine">Aug 2026 statement overdue ${dur(SIM_NOW - c.dueDate)} · RM ${esc(c.bor.rm)}</span><button class="btn sm" onclick="A.upload('${c.bId}')">Upload</button></div>`).join('') || '<p class="muted">None</p>'}
    <p class="fine muted">Portfolio-wide: ${PORT.overdue} statements overdue.</p></div>
    <div class="card"><h3>RM SLA monitor</h3>${slaEx.length ? `<table class="tbl compact"><tbody>${slaEx.map(({ c, e }) => { const left = e.dueAt - SIM_NOW; return `<tr class="click" onclick="A.go({page:'case',id:'${c.id}',tab:'exceptions',ex:'${e.id}'})"><td><b>${esc(c.bor.short)}</b><div class="fine muted">${e.id} · ${esc(c.bor.rm)}</div></td><td><span class="sla sla-${left < 0 ? 'Breached' : left < 4 * HR ? 'Warning' : 'Ontrack'}">${left < 0 ? 'Breached ' + dur(-left) : 'Due in ' + hm(left)}</span></td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">No exceptions with RMs.</p>'}</div></div>
  <div class="card"><h3>Prism Intelligence — monitoring insights</h3><p class="fine muted">Observable trends in reported data. They are not credit conclusions.</p>
  ${cs.map(c => ({ c, i: ewsInsights(c) })).filter(x => x.i.length).map(x => `<div class="mon-b"><a href="#" onclick="A.go({page:'borrower',id:'${x.c.bId}'});return false"><b>${esc(x.c.bor.name)}</b></a><div class="ews compact">${x.i.map(i => `<div class="ews-card s-${i.sev}"><b>${esc(i.k)}</b><p>${esc(i.t)}</p></div>`).join('')}</div></div>`).join('')}</div>`;
}

/* ---------- Analytics & drilldown ---------- */
const TREE = { name: 'All regions', kids: [
  { name: 'West', kids: [{ name: 'Pune', kids: [{ name: 'Pune Corporate Banking', rms: ['Rahul Mehta', 'Swati Kulkarni'] }, { name: 'Pune – Chakan SME', rms: ['Omkar Patil'] }] }, { name: 'Mumbai', kids: [{ name: 'Mumbai – Andheri MCG', rms: ['Kavita Rao', 'Farhan Shaikh'] }, { name: 'Mumbai – Fort Corporate', rms: ['Ritu Menon'] }] }, { name: 'Ahmedabad', kids: [{ name: 'Ahmedabad Commercial', rms: ['Nikhil Shah', 'Hetal Desai'] }] }] },
  { name: 'North', kids: [{ name: 'Delhi NCR', kids: [{ name: 'Gurugram Corporate', rms: ['Aman Verma', 'Neha Kapoor'] }, { name: 'Noida SME', rms: ['Rohit Bansal'] }] }, { name: 'Ludhiana', kids: [{ name: 'Ludhiana Industrial', rms: ['Harpreet Singh'] }] }, { name: 'Jaipur', kids: [{ name: 'Jaipur Commercial', rms: ['Vivek Sharma'] }] }] },
  { name: 'South', kids: [{ name: 'Coimbatore', kids: [{ name: 'Coimbatore Commercial', rms: ['Arvind Kumar'] }] }, { name: 'Hyderabad', kids: [{ name: 'Hyderabad Commercial', rms: ['Sneha Reddy', 'Kiran Rao'] }] }, { name: 'Bengaluru', kids: [{ name: 'Bengaluru Whitefield MCG', rms: ['Deepa Nair', 'Suresh Gowda'] }] }] },
  { name: 'East', kids: [{ name: 'Kolkata', kids: [{ name: 'Kolkata Commercial', rms: ['Debashis Sen', 'Ananya Bose'] }] }, { name: 'Bhubaneswar', kids: [{ name: 'Bhubaneswar SME', rms: ['Pradeep Mohanty'] }] }] },
] };
const REGION_STATS = { West: [162, 150, 17, 26, 3, 10, 7.46], North: [104, 96, 13, 17, 3, 7, 5.12], South: [98, 90, 11, 15, 2, 6, 3.58], East: [64, 60, 7, 9, 1, 4, 2.56] };
function splitStat(stat, n, seed){
  const w = Array.from({ length: n }, (_, i) => 1 + ((seed * 7 + i * 13) % 5) * 0.35), tw = sum(w);
  return Array.from({ length: n }, (_, i) => stat.map((v, j) => { if (i === n - 1) return null; return j === 6 ? Math.round(v * w[i] / tw * 100) / 100 : Math.round(v * w[i] / tw); })).map((arr, i, all) => i === n - 1 ? stat.map((v, j) => j === 6 ? Math.round((v - sum(all.slice(0, -1).map(a => a[j]))) * 100) / 100 : v - sum(all.slice(0, -1).map(a => a[j]))) : arr);
}
function drillNodes(){
  const path = ST.ui.drill;
  if (!path.length) return TREE.kids.map(r => ({ name: r.name, st: REGION_STATS[r.name], lvl: 'Region' }));
  let node = TREE, stat = null, seed = 1;
  for (const [i, p] of path.entries()){
    const kids = node.kids || node.rms.map(n => ({ name: n }));
    const idx = kids.findIndex(k => k.name === p);
    stat = i === 0 ? REGION_STATS[p] : splitStat(stat, kids.length, seed)[idx]; seed += idx + 3; node = kids[idx];
  }
  const kids = node.kids || (node.rms ? node.rms.map(n => ({ name: n })) : null);
  const lvls = ['Region', 'Zone', 'Branch', 'RM', 'Borrower'];
  if (!kids) return { borrowers: true, rm: node.name, st: stat };
  const parts = splitStat(stat, kids.length, seed);
  return kids.map((k, i) => ({ name: k.name, st: parts[i], lvl: lvls[path.length] }));
}
function vAnalytics(){
  const path = ST.ui.drill, nodes = drillNodes();
  const crumbs = `<div class="drill-crumbs"><a href="#" onclick="A.drill(-1);return false">Bank</a>${path.map((p, i) => `${icon('chev', 12)}<a href="#" onclick="A.drill(${i});return false">${esc(p)}</a>`).join('')}</div>`;
  let dt;
  if (nodes.borrowers){ const bs = BORROWERS.filter(b => b.rm === nodes.rm), st = nodes.st;
    dt = `<p class="fine muted">${nodes.rm} · ${st[0]} borrowers monitored · ${bs.length} in demo dataset</p><table class="tbl"><thead><tr><th>Borrower</th><th>Statement</th><th class="r">DP change</th><th>Open exceptions</th><th>Signals</th></tr></thead><tbody>${bs.map(b => { const c = caseByB(b.id); return `<tr class="click" onclick="A.go({page:'borrower',id:'${b.id}'})"><td><b>${esc(b.name)}</b></td><td>${badge(caseStatus(c))}</td><td class="r num">${c.received ? cr(CRE.calculateDP(c).change) : '—'}</td><td>${openExcs(c).length}</td><td>${c.received ? ewsInsights(c).length : '—'}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">No demo borrowers for this RM; figures above are portfolio aggregates.</td></tr>'}</tbody></table>`; }
  else dt = `<table class="tbl"><thead><tr><th>${nodes[0].lvl}</th><th class="r">Borrowers</th><th class="r">Statements due</th><th class="r">Compliance</th><th class="r">Overdue</th><th class="r">Open exceptions</th><th class="r">SLA breaches</th><th class="r">DP deterioration</th><th class="r">Limit reduction</th></tr></thead><tbody>
    ${nodes.map(n => `<tr class="click" onclick="A.drill('${esc(n.name).replace(/'/g, "\\'")}')"><td><b>${esc(n.name)}</b> ${icon('chev', 12)}</td><td class="r num">${n.st[0]}</td><td class="r num">${n.st[1]}</td><td class="r num">${n.st[1] ? pct((n.st[1] - n.st[2]) / n.st[1] * 100, 0) : '—'}</td><td class="r num">${n.st[2]}</td><td class="r num">${n.st[3]}</td><td class="r num">${n.st[4]}</td><td class="r num">${n.st[5]}</td><td class="r num">₹${n.st[6].toFixed(2)} Cr</td></tr>`).join('')}
    <tr class="tot"><td>Total</td>${[0, 1].map(j => `<td class="r num">${sum(nodes.map(n => n.st[j]))}</td>`).join('')}<td class="r num">${pct((sum(nodes.map(n => n.st[1])) - sum(nodes.map(n => n.st[2]))) / sum(nodes.map(n => n.st[1])) * 100, 0)}</td>${[2, 3, 4, 5].map(j => `<td class="r num">${sum(nodes.map(n => n.st[j]))}</td>`).join('')}<td class="r num">₹${sum(nodes.map(n => n.st[6])).toFixed(2)} Cr</td></tr></tbody></table>`;
  const cs = ST.cases.filter(c => c.received);
  return pageHead('Portfolio analytics', 'Management drill-down: bank → region → zone → branch → RM → borrower') +
  `<div class="card">${crumbs}${dt}</div>
  <div class="card flush"><div class="card-h"><h3>Portfolio intelligence</h3><span class="fine muted">Demo borrowers</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Borrower</th><th class="r">Sanction</th><th class="r">Outstanding</th><th class="r">Current DP</th><th class="r">Previous DP</th><th class="r">MoM change</th><th class="r">Overdue debtors</th><th class="r">Exceptions</th><th>Risk indicators</th></tr></thead><tbody>
  ${cs.map(c => { const h = histOf(c), cur = h[11], prev = h[10], ch = (cur.dp - prev.dp) / prev.dp * 100, k = CRE.calculateDP(c);
    const tags = [];
    if (ch <= -5) tags.push(['DP ↓' + Math.abs(ch).toFixed(0) + '%', 'red']);
    const s0 = h[8].over / h[8].rec * 100, s1 = cur.over / cur.rec * 100; if (s1 - s0 >= 3) tags.push(['Debtor ageing ↑' + (s1 - s0).toFixed(0) + '%', 'amber']);
    const inv = (cur.stock - prev.stock) / prev.stock * 100; if (inv <= -10) tags.push(['Inventory ↓' + Math.abs(inv).toFixed(0) + '%', 'red']);
    const del = Math.max(...h.map(x => x.delay)); if (del >= 7) tags.push(['Statement ' + del + ' days late', 'amber']);
    const rep = h.slice(8).filter(x => x.exc > 0).length; if (rep >= 3) tags.push(['Recurring discrepancy ×' + rep, 'amber']);
    if (k.shortfall) tags.push(['Outstanding > DP', 'red']);
    return `<tr class="click" onclick="A.go({page:'borrower',id:'${c.bId}'})"><td><b>${esc(c.bor.name)}</b></td><td class="r num">${cr(c.sanction)}</td><td class="r num">${cr(c.cbsOutstanding)}</td><td class="r num">${cr(cur.dp)}</td><td class="r num">${cr(prev.dp)}</td><td class="r num ${ch < 0 ? 'neg' : 'pos'}">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</td><td class="r num">${lk(k.overaged)}</td><td class="r num">${c.excs.length}</td><td>${tags.map(([t, cl]) => `<span class="badge b-${cl}">${t}</span>`).join(' ') || '<span class="muted fine">—</span>'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}

/* ---------- Documents ---------- */
function vDocuments(){
  const docs = [];
  ST.cases.forEach(c => {
    if (c.received){ docs.push({ c, id: 'DOC-' + c.id.slice(-6) + '-SS', type: 'Stock statement', name: c.bor.short.replace(/\s/g, '_') + '_SS_Aug2026' + (c.version > 1 ? '_rev2' : '') + '.pdf', pages: c.pages.some(p => p.span) ? c.pages[c.pages.length - 1].span[1] : c.pages.length, ver: 'v' + c.version, q: c.quality + '%', at: c.receivedAt });
      if (c.priorVersion) docs.push({ c, id: 'DOC-' + c.id.slice(-6) + '-SS1', type: 'Stock statement (superseded)', name: c.bor.short.replace(/\s/g, '_') + '_SS_Aug2026.pdf', pages: c.pages.length, ver: 'v1', q: '94%', at: c.priorVersion.received, sup: true }); }
    docs.push({ c, id: 'DOC-' + c.id.slice(-6) + '-CAM', type: 'CAM / DN', name: 'CAM_' + c.bor.short.replace(/\s/g, '_') + '_' + c.cam.version.split(' ')[1] + '.pdf', pages: 24, ver: c.cam.version, q: '99%', at: new Date(c.cam.camDate).getTime() });
    c.excs.forEach(e => (e.rm?.files || []).forEach(f => docs.push({ c, id: 'EVD-' + e.id.slice(-5), type: 'RM evidence', name: f, pages: 1, ver: 'v1', q: '—', at: e.rm.ts })));
  });
  docs.sort((a, b) => b.at - a.at);
  return pageHead('Documents', docs.length + ' documents in the case repository') + `<div class="card flush"><div class="tscroll"><table class="tbl"><thead><tr><th>Document ID</th><th>Borrower</th><th>Type</th><th>File</th><th class="r">Pages</th><th>Version</th><th>Quality</th><th>Received</th></tr></thead><tbody>
  ${docs.map(d => `<tr class="click ${d.sup ? 'dim' : ''}" onclick="A.go({page:'case',id:'${d.c.id}',tab:'${d.type === 'CAM / DN' ? 'cam' : 'docs'}'})"><td>${d.id}</td><td>${esc(d.c.bor.short)}</td><td>${d.type}</td><td>${icon('file', 13)} ${esc(d.name)}</td><td class="r num">${d.pages}</td><td>${esc(d.ver)}</td><td>${d.q}</td><td>${fmtDT(d.at)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

/* ---------- Rules ---------- */
function vRules(){
  const edit = can('admin'), c = ST.cfg;
  return pageHead('Rules & configuration', edit ? 'Changes are versioned and audited' : 'Read-only — editing requires the Administrator role', edit ? `<button class="btn primary" onclick="A.ruleEdit()">New rule</button>` : roleGate('admin', 'Editing by Administrator')) +
  `<div class="card flush"><div class="card-h"><h3>Credit rules</h3><span class="fine muted">CAM/DN terms on each case take precedence; product rules apply as defaults to new sanctions</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Rule ID</th><th>Rule</th><th>Category</th><th>Value</th><th>Scope</th><th>Effective from</th><th>Clause</th><th>Version</th><th>Status</th><th></th></tr></thead><tbody>
  ${ST.rules.map(r => `<tr><td class="nowrap"><b>${r.id}</b></td><td>${esc(r.name)}</td><td>${r.cat}</td><td>${esc(r.value)}</td><td>${esc(r.scope)}</td><td>${r.eff}</td><td>${r.clause}</td><td>v${r.ver}</td><td>${badge(r.status)}</td><td>${edit ? `<button class="btn sm" onclick="A.ruleEdit('${r.id}')">Edit</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="grid2"><div class="card"><h3>SLA configuration</h3>${kv([['RM initial response', c.sla.rmResponse + ' hours'], ['Reminder', c.sla.reminder + ' hours before expiry'], ['First escalation', c.sla.esc1 + ' hours (to branch head)'], ['Second escalation', c.sla.esc2 + ' hours (to zonal credit head)'], ['Case turnaround target', c.sla.caseTAT + ' hours from receipt']])}${edit ? `<button class="btn sm" onclick="A.slaEdit()">Edit SLA</button>` : ''}</div>
    <div class="card"><h3>Confidence & tolerance</h3>${kv([['High confidence', '≥ ' + c.highThreshold + '%'], ['Moderate', c.reviewThreshold + '–' + (c.highThreshold - 1) + '%'], ['Review required', '< ' + c.reviewThreshold + '%'], ['Arithmetic tolerance', inr(c.arithTol)]])}
      ${edit ? `<div class="sl"><label>Review threshold <b class="num">${c.reviewThreshold}%</b></label><input type="range" min="60" max="95" value="${c.reviewThreshold}" onchange="A.setThreshold(this.value)"></div><p class="fine muted">Applies live: fields below the threshold return to validation review.</p>` : ''}
      <p class="fine muted">Confidence scores apply only to extracted content. Arithmetic and DP are deterministic.</p></div></div>`;
}

/* ---------- Audit ---------- */
function vAudit(){
  const f = ST.ui.af, q = (f.q || '').toLowerCase();
  const ev = ST.audit.filter(e => (!f.role || e.role === f.role) && (!f.case || e.caseId === f.case) && (!q || (e.action + ' ' + e.user + ' ' + e.reason + ' ' + e.ref + ' ' + e.old + ' ' + e.nw).toLowerCase().includes(q))).sort((a, b) => b.ts - a.ts);
  const roles = [...new Set(ST.audit.map(e => e.role))].sort();
  return pageHead('Audit trail', ST.audit.length + ' immutable events · append-only log') + `<div class="filters"><div class="search-in">${icon('search', 14)}<input placeholder="Search action, user, reason, reference" value="${esc(f.q || '')}" onchange="A.af('q',this.value)"></div>
    <select onchange="A.af('role',this.value)"><option value="">All roles</option>${roles.map(r => `<option ${f.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
    <select onchange="A.af('case',this.value)"><option value="">All cases</option>${ST.cases.map(c => `<option value="${c.id}" ${f.case === c.id ? 'selected' : ''}>${c.id} · ${esc(c.bor.short)}</option>`).join('')}</select></div>
  <div class="card flush"><div class="card-h"><h3>Events</h3><span class="fine muted">${ev.length} shown · ${icon('shield', 12)} hash-chained (simulated)</span></div>${auditTable(ev.slice(0, 250))}</div>`;
}

/* ---------- Admin ---------- */
function vAdmin(){
  return pageHead('Administration', 'Users, roles, templates and workflow') + `<div class="grid2"><div class="card flush"><div class="card-h"><h3>Users & role mapping</h3></div><table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Scope</th><th>Status</th></tr></thead><tbody>
  ${Object.entries(ROLES).map(([k, r]) => `<tr><td><b>${r.name}</b></td><td>${r.title}</td><td>${k === 'rm' ? 'Pune Corporate Banking' : k === 'checker' ? 'West region · L2' : 'All regions'}</td><td>${badge('Active')}</td></tr>`).join('')}
  ${RMS.slice(1).map(n => `<tr><td>${n}</td><td>Relationship Manager</td><td>${esc(BORROWERS.find(b => b.rm === n)?.branch || '')}</td><td>${badge('Active')}</td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h3>Segregation of duties</h3><ul class="plain"><li>${icon('shield', 13)} Maker cannot approve own DP submission</li><li>${icon('shield', 13)} Overrides require comment and are shown to checker</li><li>${icon('shield', 13)} Deterministic arithmetic cannot be overridden</li><li>${icon('shield', 13)} Auditor role is read-only across all screens</li><li>${icon('shield', 13)} Limit update only after checker approval</li></ul>
  <h3 style="margin-top:18px">Workflow</h3><ol class="chron small">${STAGES.map(s => `<li class="done"><b>${s}</b></li>`).join('')}</ol></div></div>
  <div class="card flush"><div class="card-h"><h3>Document templates</h3><span class="fine muted">Borrower formats learned by Prism IDP</span></div><table class="tbl"><thead><tr><th>Template</th><th>Borrowers</th><th>Page types</th><th>Avg confidence</th><th>Last trained</th></tr></thead><tbody>
    <tr><td>Bank standard stock statement (Form SS-1)</td><td>212</td><td>8</td><td>96%</td><td>02-Sep-2026</td></tr><tr><td>Tally export — stock & debtors</td><td>118</td><td>6</td><td>94%</td><td>28-Aug-2026</td></tr><tr><td>CA-certified statement (free format)</td><td>71</td><td>5–14</td><td>89%</td><td>21-Aug-2026</td></tr><tr><td>Scanned handwritten (legacy)</td><td>27</td><td>varies</td><td>74%</td><td>14-Aug-2026</td></tr></tbody></table></div>`;
}
