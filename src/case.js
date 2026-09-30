'use strict';
/* ================= Case workspace ================= */
const CASE_TABS = [
  ['overview', 'Overview'], ['docs', 'Document intelligence'], ['unified', 'Unified statement'], ['arith', 'Arithmetic'], ['cam', 'CAM / DN terms'],
  ['compare', 'CAM vs statement'], ['exceptions', 'Exceptions'], ['dp', 'Drawing power'], ['approval', 'Approval'], ['limit', 'Limit update'], ['timeline', 'Timeline & audit'], ['reports', 'Reports'],
];

function nextAction(c){
  const st = caseStatus(c), pend = pendingFields(c).length, op = c.excs.filter(e => e.status === 'Open');
  const rmOpen = op.filter(e => e.rmReq);
  switch (st){
    case 'Not Received': return { t: 'Statement not received — upload it when the borrower submits', role: 'analyst', btn: 'Upload statement', fn: `A.upload('${c.bId}')` };
    case 'Validation Review': return { t: pend + ' extracted field' + (pend > 1 ? 's' : '') + ' below the ' + ST.cfg.reviewThreshold + '% confidence threshold need validation', role: 'analyst', btn: 'Validate fields', fn: `A.tab('docs')` };
    case 'Exception Review': case 'Credit Review':
      if (rmOpen.length) return { t: rmOpen.length + ' exception' + (rmOpen.length > 1 ? 's need' : ' needs') + ' borrower clarification; ' + (op.length - rmOpen.length) + ' can be settled by credit', role: 'analyst', btn: 'Review exceptions', fn: `A.tab('exceptions')` };
      if (op.length) return { t: op.length + ' open exception' + (op.length > 1 ? 's' : '') + ' to settle before DP can be finalised', role: 'analyst', btn: 'Review exceptions', fn: `A.tab('exceptions')` };
      return { t: 'Checker returned the case — review comments and resubmit DP', role: 'analyst', btn: 'Open drawing power', fn: `A.tab('dp')` };
    case 'Awaiting RM': return { t: 'Waiting for ' + c.bor.rm + ' to respond to ' + c.excs.filter(e => e.status === 'Sent to RM').length + ' exception(s)', role: 'rm', btn: 'Respond as RM', fn: `A.tab('exceptions')` };
    case 'RM Responded': return { t: 'RM clarification received — accept, partially accept or reject', role: 'analyst', btn: 'Review response', fn: `A.tab('exceptions')` };
    case 'Ready for DP': return { t: 'All exceptions settled — review drawing power and submit for approval', role: 'analyst', btn: 'Open drawing power', fn: `A.tab('dp')` };
    case 'Awaiting Approval': return { t: 'Maker has submitted DP of ' + cr(c.submission.dp) + ' for approval', role: 'checker', btn: 'Review for approval', fn: `A.tab('approval')` };
    case 'Limit Update Pending': return { t: 'Approved — send the new operative limit to core banking', role: 'ops', btn: 'Open limit update', fn: `A.tab('limit')` };
    case 'Limit Update Failed': return { t: 'Core banking rejected the last update — retry or process manually', role: 'ops', btn: 'Open limit update', fn: `A.tab('limit')` };
    case 'Completed': return { t: 'Case closed — limit updated in core banking', role: null, btn: 'Borrower history', fn: `A.go({page:'borrower',id:'${c.bId}'})` };
  }
  return { t: '', role: null };
}

function caseHeader(c){
  const st = caseStatus(c), k = CRE.calculateDP(c), sla = caseSLA(c), si = stageIdx(st), na = nextAction(c);
  const wrongRole = na.role && na.role !== ST.role;
  return `<div class="case-head">
    <div class="ch-top">
      <div>
        <div class="crumbs"><a href="#" onclick="A.go({page:'queue'});return false">Stock statements</a>${icon('chev', 12)}<span>${c.id}</span></div>
        <h1 class="ch-name"><a href="#" onclick="A.go({page:'borrower',id:'${c.bId}'});return false">${esc(c.bor.name)}</a></h1>
        <div class="ch-meta"><span>${c.id}</span><span>${c.month}</span><span>${c.cam.facility}</span><span>${c.bor.cust}</span><span>RM ${esc(c.bor.rm)}</span>${c.version > 1 ? `<span class="tag">Revised v${c.version}</span>` : ''}</div>
      </div>
      <div class="ch-status">${badge(st)} <span class="sla sla-${(sla.s || '').replace(' ', '')}">${icon('clock', 13)} ${esc(sla.t)}</span></div>
    </div>
    <div class="ch-figs">
      <div><span>Sanction</span><b class="num">${cr(c.sanction)}</b></div>
      <div><span>Outstanding</span><b class="num">${cr(c.cbsOutstanding)}</b></div>
      <div><span>Existing operative limit</span><b class="num">${cr(c.operative)}</b></div>
      <div><span>${c.received ? 'Current DP' : 'Last DP'}</span><b class="num">${c.received ? cr(k.recommended) : cr(histOf(c)[10].op)}</b></div>
      <div><span>Change</span><b class="num ${k.change < 0 ? 'neg' : 'pos'}">${c.received ? (k.change >= 0 ? '+' : '') + cr(k.change) : '—'}</b></div>
    </div>
    <ol class="stepper">${STAGES.map((s, i) => `<li class="${i < si ? 'done' : i === si ? 'cur' : ''}">${s}</li>`).join('')}</ol>
    ${na.t ? `<div class="next ${wrongRole ? 'other' : ''}"><span>${icon('play', 13)} <b>Next:</b> ${esc(na.t)}</span>
      <span>${wrongRole ? `<button class="btn sm" onclick="A.setRole('${na.role}')">Switch to ${ROLES[na.role].short}</button>` : ''}${na.btn ? `<button class="btn sm primary" onclick="${na.fn}">${na.btn}</button>` : ''}</span></div>` : ''}
  </div>`;
}

function caseView(){
  const r = ST.route, c = CASE(r.id); if (!c) return emptyState('Case not found', 'The case may have been removed.');
  const tab = r.tab || 'overview';
  const counts = { exceptions: openExcs(c).length };
  const body = !c.received && tab !== 'overview' && tab !== 'cam' ? emptyState('Statement not received', 'This case opens when the borrower\'s August statement is uploaded.', `<button class="btn primary" onclick="A.upload('${c.bId}')">${icon('upload')} Upload stock statement</button>`)
    : ({ overview: tOverview, docs: tDocs, unified: tUnified, arith: tArith, cam: tCam, compare: tCompare, exceptions: tExceptions, dp: tDP, approval: tApproval, limit: tLimit, timeline: tTimeline, reports: tReports }[tab] || tOverview)(c);
  return caseHeader(c) + `<nav class="tabs" role="tablist">${CASE_TABS.map(([k, l]) => `<button role="tab" class="${k === tab ? 'on' : ''}" onclick="A.tab('${k}')">${l}${counts[k] ? ` <span class="cnt">${counts[k]}</span>` : ''}</button>`).join('')}</nav><div class="tab-body">${body}</div>`;
}

/* ---------- Overview ---------- */
function tOverview(c){
  if (!c.received) return `<div class="grid2"><div class="card"><h3>Statement status</h3>${kv([['Statement month', c.month], ['Due date', fmtD(c.dueDate)], ['Status', badge('Not Received')], ['Overdue by', dur(SIM_NOW - c.dueDate)], ['Expected from', esc(c.from)]])}
    <p class="muted" style="margin-top:12px">Upload the statement when it arrives. Prism will classify pages, extract data, recalculate totals and compare against CAM/DN terms automatically.</p>
    <button class="btn primary" onclick="A.upload('${c.bId}')">${icon('upload')} Upload stock statement</button></div>${tCam(c, true)}</div>`;
  const k = CRE.calculateDP(c), di = DocumentIntelligenceService.analyseDocument(c), ar = CRE.arithmeticChecks(c);
  const oe = openExcs(c).sort((a, b) => ['Critical', 'High', 'Medium', 'Low'].indexOf(a.sev) - ['Critical', 'High', 'Medium', 'Low'].indexOf(b.sev));
  const pend = pendingFields(c), cmp = compareRows(c), fails = cmp.filter(r => r.res === 'FAIL').length;
  const attention = [
    ...pend.map(f => `<li><span class="al-i amber">${icon('eye', 14)}</span><div><b>${esc(f.name)}</b> extracted at ${f.conf}% confidence<div class="muted">Page ${f.page} · needs human validation</div></div><button class="btn sm" onclick="A.tab('docs')">Validate</button></li>`),
    ...oe.map(e => { const v = exView(c, e); return `<li><span class="al-i">${sevDot(e.sev)}</span><div><b>${esc(e.title)}</b><div class="muted">${e.id} · ${e.status}${v.impact ? ' · DP impact ' + amt(v.impact) : ''}</div></div><button class="btn sm" onclick="A.openEx('${e.id}')">Open</button></li>`; }),
  ];
  const chk = di.checks.filter(x => x.status !== 'PASS').length;
  return `<div class="ov-grid">
    <section class="card"><h3>What needs attention</h3>${attention.length ? `<ul class="attn">${attention.join('')}</ul>` : `<div class="okline">${icon('checkc')} Nothing outstanding on this case.</div>`}</section>
    <section class="card dp-card">
      <h3>Drawing power impact</h3>
      <div class="dp-flow"><div><span>Existing operative limit</span><b class="num">${cr(c.operative)}</b></div><div class="arrow">${icon('chev', 20)}</div><div><span>Recommended operative limit</span><b class="num big">${cr(k.recommended)}</b></div></div>
      <div class="dp-delta ${k.change < 0 ? 'neg' : 'pos'}">${k.change < 0 ? 'Reduction of ' : 'Increase of '}${cr(Math.abs(k.change))} ${whyBtn('limit:' + c.id, 'Why?')}</div>
      ${k.shortfall ? `<div class="warnline">${icon('alert', 14)} Outstanding ${cr(c.cbsOutstanding)} exceeds recommended DP by ${lk(k.shortfall)} — irregularity to be regularised.</div>` : ''}
      <button class="btn" onclick="A.tab('dp')">Open DP calculation</button>
    </section>
    <section class="card"><h3>What the system found</h3>
      <div class="found">
        <div onclick="A.tab('docs')"><b class="num">${c.pages.length}${c.pages.some(p => p.span) ? '+' : ''}</b><span>page groups classified</span></div>
        <div onclick="A.tab('docs')"><b class="num">${di.overall}%</b><span>extraction confidence</span></div>
        <div onclick="A.tab('docs')"><b class="num ${chk ? 'neg' : ''}">${di.checks.length - chk}/${di.checks.length}</b><span>document checks passed</span></div>
        <div onclick="A.tab('arith')"><b class="num ${ar.some(a => a.status === 'MISMATCH') ? 'neg' : ''}">${ar.filter(a => a.status === 'MISMATCH').length}</b><span>arithmetic mismatches</span></div>
        <div onclick="A.tab('compare')"><b class="num ${fails ? 'neg' : ''}">${fails}</b><span>CAM/DN variances</span></div>
        <div onclick="A.tab('exceptions')"><b class="num">${c.excs.length}</b><span>exceptions raised</span></div>
      </div>
      <p class="fine muted">Extraction by ${DocumentIntelligenceService.provider}. Every figure feeding DP is recalculated by the deterministic credit rule engine.</p>
    </section>
    <section class="card"><h3>Borrower signals</h3>${ewsCards(c, true)}</section>
  </div>`;
}

/* ---------- Document intelligence ---------- */
function tDocs(c){
  const di = DocumentIntelligenceService.analyseDocument(c), cur = ST.ui.page || 1, p = c.pages.find(x => x.n === cur) || c.pages[0];
  const thr = ST.cfg.reviewThreshold;
  return `<div class="doc-ws">
    <div class="thumbs">${c.pages.map(pg => `<button class="thumb ${pg.n === p.n ? 'on' : ''}" onclick="A.page(${pg.n})"><div class="th-mini ${pg.conf < thr ? 'low' : ''}">${miniLines(pg)}</div><div class="th-l"><b>${pg.span ? pg.span[0] + '–' + pg.span[1] : 'P' + pg.n}</b> ${esc(pg.type)}</div>${confPill(pg.conf)}${pg.conf < thr ? '<span class="rr">Review</span>' : ''}</button>`).join('')}</div>
    <div class="viewer"><div class="v-bar"><span>Page ${p.span ? p.span[0] + '–' + p.span[1] : p.n} of ${c.pages.some(x => x.span) ? c.pages[c.pages.length - 1].span[1] : c.pages.length} · <b>${esc(p.type)}</b> · classified at ${p.conf}%</span><span class="muted">${esc(c.from)} · v${c.version}${c.scanned ? ' · scanned, skew corrected for extraction' : ''}</span></div>
      <div class="v-stage">${renderPage(c, p)}</div></div>
    <aside class="doc-side">
      <div class="card tight"><h3>Document validation</h3>
        <ul class="vlist">${di.checks.map(x => `<li><button onclick="A.hl(${x.page},'${x.region}')" class="${ST.ui.hl && ST.ui.hl.region === x.region && ST.ui.hl.page === x.page ? 'on' : ''}"><span>${esc(x.label)}</span>${badge(x.status)}</button><div class="muted fine">${esc(x.detail)}</div></li>`).join('')}</ul>
        <div class="dq"><div><span>Document quality</span><b class="num">${di.quality}%</b></div><div><span>Overall confidence</span><b class="num">${di.overall}%</b></div></div>
      </div>
      <div class="card tight"><h3>Extracted key fields</h3><p class="fine muted">Below ${thr}% needs validation. Confidence applies to extraction only, never to calculations.</p>
        <ul class="fields">${c.fields.map(f => fieldRow(c, f)).join('')}</ul></div>
    </aside>
  </div>`;
}
function fieldRow(c, f){
  const pend = fieldPending(f), v = f.reviewed ? f.validated : f.extracted, show = x => f.type === 'amt' ? inr(x) : esc(x);
  const act = pend && can('analyst') ? `<div class="f-act"><button class="btn sm" onclick="A.acceptField('${c.id}','${f.key}')">Accept</button><button class="btn sm" onclick="A.editField('${c.id}','${f.key}')">Edit</button><button class="btn sm ghost" onclick="A.hl(${f.page},'${f.region}')">View source</button></div>`
    : pend ? `<div class="f-act">${roleGate('analyst', 'Validation by Credit Analyst')}</div>` : `<div class="f-act"><button class="btn sm ghost" onclick="A.hl(${f.page},'${f.region}')">View source</button></div>`;
  return `<li class="${pend ? 'pend' : ''}"><div class="f-top"><span>${esc(f.name)}</span>${confPill(f.conf)}</div><div class="f-val num">${show(v)}</div>
    <div class="fine muted">Page ${f.page} · ${f.reviewed ? (f.validated !== f.extracted ? 'Corrected by ' + esc(f.by) + ' (was ' + show(f.extracted) + ')' : 'Accepted by ' + esc(f.by)) : pend ? 'Pending validation' : 'Auto-accepted'}</div>${act}</li>`;
}
function miniLines(p){ return '<i></i><i></i><i class="s"></i><i></i><i class="s"></i><i></i>'; }

function renderPage(c, p){
  const hl = ST.ui.hl, h = r => (hl && hl.page === p.n && hl.region === r) ? ' hl-on' : '';
  const b = c.bor, fOf = k => c.fields.find(f => f.key === k), low = k => { const f = fOf(k); return f && f.conf < ST.cfg.reviewThreshold ? ' smudge' : ''; };
  const num = v => (v / 1).toLocaleString('en-IN');
  const T = (rows, cols) => `<table class="pt"><thead><tr>${cols.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  let body = '';
  const invDate = d => fmtD(STMT_DATE - d.age * DAY);
  const buckets = () => { const bk = { '0–30': 0, '31–60': 0, '61–90': 0, '91–120': 0, '>120': 0 }; c.debtors.forEach(d => { const a = d.age; bk[a <= 30 ? '0–30' : a <= 60 ? '31–60' : a <= 90 ? '61–90' : a <= 120 ? '91–120' : '>120'] += d.amt; }); return bk; };
  switch (true){
    case p.type === 'Stock Summary':
      body = `<div class="pr${h('table')}" data-r="table">${T(c.stock.map((r, i) => `<tr><td>${i + 1}</td><td>${r.cat}</td><td class="r">${num(r.rep)}</td></tr>`).join(''), ['#', 'Particulars', 'Amount (₹)'])}</div>
        <div class="pr ptot${h('total')}${low('stockTotal')}" data-r="total"><span>Total stock</span><span>${num(fOf('stockTotal').truth)}</span></div>
        <p class="pnote">Stocks valued at lower of cost or net realisable value. Detailed schedules annexed.</p>`; break;
    case p.type === 'Inventory Details':
      body = c.stock.map(r => r.sub ? `<div class="psub"><b>${r.cat}</b>${T(r.sub.map(s => `<tr><td>${s.name}</td><td class="r">${num(s.amt)}</td></tr>`).join('') + `<tr class="st"><td>Sub-total carried to summary</td><td class="r">${num(r.rep)}</td></tr>`, ['Item', '₹'])}</div>` : `<div class="psub"><b>${r.cat}</b><div class="pl"><span>As per stock register</span><span>${num(r.rep)}</span></div></div>`).join(''); break;
    case p.type === 'Debtor Ageing Schedule':
      body = `<div class="pr${h('table')}" data-r="table">${T(c.debtors.map(d => `<tr><td>${esc(d.name)}</td><td>${d.inv}</td><td>${invDate(d)}</td><td class="r">${num(d.amt)}</td><td class="r">${d.age}</td></tr>`).join(''), ['Debtor', 'Invoice', 'Date', '₹', 'Days'])}</div>`; break;
    case p.type === 'Debtor Ageing Summary': {
      const bk = buckets(), hasSched = c.pages.some(x => x.type === 'Debtor Ageing Schedule');
      body = (hasSched ? '' : `<div class="pr" data-r="table">${T(c.debtors.map(d => `<tr><td>${esc(d.name)}</td><td>${d.inv}</td><td class="r">${num(d.amt)}</td><td class="r">${d.age}</td></tr>`).join(''), ['Debtor', 'Invoice', '₹', 'Days'])}</div>`)
        + T(Object.entries(bk).map(([k2, v]) => `<tr><td>${k2} days</td><td class="r">${num(v)}</td></tr>`).join(''), ['Ageing bucket', 'Amount (₹)'])
        + `<div class="pr ptot${h('total')}${low('debtorTotal')}" data-r="total"><span>Total book debts</span><span>${num(fOf('debtorTotal').truth)}</span></div>`; break; }
    case p.type === 'Creditor Details':
      body = `<div class="pr${h('table')}" data-r="table">${T(c.creditors.map(x => `<tr><td>${esc(x.name)}</td><td>${x.stock ? 'Trade – stock' : 'Non-trade'}</td><td class="r">${num(x.amt)}</td><td>${x.custDed ? 'Yes' : 'No'}</td></tr>`).join(''), ['Creditor', 'Nature', '₹', 'In DP working'])}</div>
        <div class="pr ptot${h('total')}${low('credTotal')}" data-r="total"><span>Total creditors</span><span>${num(fOf('credTotal').truth ?? fOf('credTotal').extracted)}</span></div>`; break;
    case p.type === 'Bank Limits & DP Working': {
      const cs = fOf('stockTotal').truth, cd = fOf('debtorTotal').truth, sdp = Math.round((cs - c.custDed) * (100 - c.custSM) / 100), rdp = Math.round(cd * (100 - c.custRM) / 100);
      body = `${T(`<tr><td>Our bank</td><td>${c.cam.facility}</td><td class="r pr${h('sanction')}" data-r="sanction">${num(c.sanction)}</td><td class="r pr${h('outstanding')}${low('outstanding')}" data-r="outstanding">${num(fOf('outstanding').truth ?? fOf('outstanding').extracted)}</td></tr>`, ['Bank', 'Facility', 'Sanction (₹)', 'Outstanding (₹)'])}
        <div class="psub"><b>Drawing power working (by borrower)</b>
        <div class="pl"><span>Total stock</span><span>${num(cs)}</span></div><div class="pl"><span>Less: creditors</span><span>${num(c.custDed)}</span></div>
        <div class="pl"><span>Less: margin @ ${c.custSM}%</span><span>${num(Math.round((cs - c.custDed) * c.custSM / 100))}</span></div><div class="pl"><span>Book debts less margin @ ${c.custRM}%</span><span>${num(rdp)}</span></div>
        <div class="pl b"><span>Drawing power claimed</span><span>${num(sdp + rdp)}</span></div></div>`; break; }
    case p.type === 'Declaration':
      body = `<div class="pr pdecl${h('declaration')}${low('declaration')}" data-r="declaration"><p>We hereby declare that the stocks and book debts stated above are the absolute property of the company, are free from any charge other than that of the bank, are fully insured, and that the particulars furnished are true and correct to the best of our knowledge.</p>
        <p>We further declare that no receivable above is due from an associate or group concern except as disclosed.</p></div><p class="pnote">Place: ${esc(b.zone)} · Date: ${fmtD(c.receivedAt - 2 * DAY)}</p>`; break;
    default:
      body = p.span ? `<p class="pnote"><b>Invoice listing — pages ${p.span[0]}–${p.span[1]} (${p.span[1] - p.span[0] + 1} pages)</b></p>` + Array.from({ length: 18 }, (_, i) => `<div class="pl dim"><span>INV-${7000 + i * 13} · ${fmtD(STMT_DATE - (i * 7 % 120) * DAY)}</span><span>${num(L(1 + (i * 37 % 19)))}</span></div>`).join('')
        : `<div class="psub"><b>Stock locations</b>${['Plant 1 – main stores', 'Plant 2 – FG warehouse', 'Third-party warehouse', 'Job-work vendors'].map((x, i) => `<div class="pl"><span>${x}</span><span>${[48, 31, 14, 7][i]}%</span></div>`).join('')}</div><p class="pnote">Insurance: Fire & SFSP policy, sum insured adequate. Hypothecation board displayed.</p>`;
  }
  const sig = p.sigReq ? `<div class="psig pr${h('signature')}" data-r="signature">${p.signed ? `<svg viewBox="0 0 120 40" class="sigsvg"><path d="M5 30c10-18 18-22 22-12s-4 16 4 6 10-20 16-8 2 14 10 4 12-14 18-6 8 10 16 2 12-8 20-4"/></svg>` : '<div class="nosig">&nbsp;</div>'}<span>Authorised signatory</span></div>` : '<div class="psig small"><span>Initialled</span></div>';
  const stamp = p.stampReq && p.stamped ? `<div class="pstamp pr${h('stamp')}" data-r="stamp"><span>${esc(b.name.split(' ').slice(0, 2).join(' ').toUpperCase())}</span><span>${esc(b.zone.toUpperCase())}</span></div>` : p.stampReq ? `<div class="pstamp none pr${h('stamp')}" data-r="stamp"></div>` : '';
  return `<div class="paper ${c.scanned ? 'scan' : ''}" style="--skew:${p.skew || 0}deg">
    <div class="plh pr${h('letterhead')}" data-r="letterhead"><b>${esc(b.name)}</b><span>Regd. office: ${esc(b.zone)} · CIN U${29000 + parseInt(b.id.slice(1)) * 7}MH2004PTC${140000 + parseInt(b.id.slice(1)) * 311}</span></div>
    <div class="ptitle pr${h('title')}" data-r="title">${p.type === 'Stock Summary' ? 'Statement of stock and book debts as on 31-Aug-2026' : esc(p.type)}<span>A/c ${b.acct}</span></div>
    ${body}<div class="pfoot">${sig}${stamp}<span class="pno pr${h('pageno')}" data-r="pageno">Page ${p.span ? p.span[0] + '–' + p.span[1] : p.n}</span></div></div>`;
}

/* ---------- Unified statement ---------- */
function tUnified(c){
  const sub = ST.route.sub || 'summary', k = CRE.calculateDP(c), hst = histOf(c);
  const subs = [['summary', 'Summary'], ['stock', 'Stock'], ['debtors', 'Debtors'], ['creditors', 'Creditors'], ['bank', 'Bank limits'], ['decl', 'Declarations'], ['supp', 'Supporting schedules']];
  let b = '';
  if (sub === 'summary') b = `<div class="card">${kv([['Borrower', esc(c.bor.name)], ['Customer ID', c.bor.cust], ['Statement month', c.month], ['Facility', c.cam.facility + ' · ' + c.bor.acct], ['Sanctioned limit', cr(c.sanction)], ['Current outstanding', cr(c.cbsOutstanding)], ['Previous DP (Jul 26)', cr(hst[10].dp)], ['Current proposed DP', cr(k.recommended) + (k.capped ? ' (capped at sanction)' : '')]], 'kv4')}
    <p class="fine muted" style="margin-top:14px">Every borrower format is normalised into this structure. Customer-reported figures are kept alongside system-recalculated values.</p></div>`;
  if (sub === 'stock'){
    const alloc = k.eligibleStock ? k.netStock / k.eligibleStock : 0; let acc = 0; const eligRows = k.rows.filter(r => r.elig);
    b = `<div class="card flush"><div class="tscroll"><table class="tbl"><thead><tr><th>Category</th><th class="r">Customer reported</th><th class="r">System recalculated</th><th>CAM eligible?</th><th class="r">Eligibility</th><th class="r">Eligible amount</th><th class="r">Margin</th><th class="r">DP contribution</th></tr></thead><tbody>
    ${k.rows.map(r => { let dpc = 0; if (r.elig){ const isLast = eligRows[eligRows.length - 1] === r; dpc = isLast ? k.stockDP - acc : Math.round(r.recalc * alloc * (100 - k.stockMarginPct) / 100); acc += dpc; }
      return `<tr><td>${r.cat}</td><td class="r num">${inr(r.rep)}</td><td class="r num ${r.rep !== r.recalc ? 'neg' : ''}">${inr(r.recalc)}${r.rep !== r.recalc ? ' ' + whyBtn('arith:' + c.id) : ''}</td><td>${r.elig ? badge('PASS').replace('PASS', 'Eligible') : `<span class="badge b-red">Ineligible</span> ${whyBtn('git:' + c.id)}`}</td><td class="r num">${r.elig ? '100%' : '0%'}</td><td class="r num">${inr(r.eligAmt)}</td><td class="r num">${r.elig ? k.stockMarginPct + '%' : '—'}</td><td class="r num">${r.elig ? inr(dpc) : '—'}</td></tr>`; }).join('')}
    <tr class="tot"><td>Total</td><td class="r num">${inr(sum(k.rows.map(r => r.rep)))}</td><td class="r num">${inr(k.grossStock)}</td><td></td><td></td><td class="r num">${inr(k.eligibleStock)}</td><td></td><td class="r num">${inr(k.stockDP)}</td></tr></tbody></table></div>
    <p class="fine muted pad">Creditor deduction of ${inr(k.creditors)} is allocated pro-rata across eligible categories before margin.</p></div>`;
  }
  if (sub === 'debtors'){
    const bk = {}; ['0–30', '31–60', '61–90', '91–120', '>120'].forEach(x => bk[x] = 0); k.debts.forEach(d => bk[d.bucket] += d.amt);
    b = `<div class="buckets">${Object.entries(bk).map(([x, v]) => `<div class="${x === '91–120' || x === '>120' ? 'bad' : ''}"><span>${x} days</span><b class="num">${lk(v)}</b><em>${pct(v / k.grossRec * 100, 0)}</em></div>`).join('')}</div>
    <div class="card flush"><div class="card-h"><h3>Receivable schedule</h3><span class="muted fine">CAM rule: only receivables up to ${c.cam.recAge} days are eligible (${CLAUSE.age})</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Debtor</th><th>Invoice</th><th>Invoice date</th><th>Due date</th><th class="r">Outstanding</th><th class="r">Ageing</th><th>Eligible?</th><th>Reason</th><th class="r">Eligible amount</th><th>Source</th></tr></thead><tbody>
    ${k.debts.map(d => `<tr class="${d.elig ? '' : 'inel'}"><td>${esc(d.name)}${d.related ? ' <span class="tag">Related party</span>' : ''}</td><td>${d.inv}</td><td>${fmtD(STMT_DATE - d.age * DAY)}</td><td>${fmtD(STMT_DATE - d.age * DAY + 45 * DAY)}</td><td class="r num">${inr(d.amt)}</td><td class="r num">${d.effAge}${d.acceptedAge != null ? ` <s class="muted">${d.age}</s>` : ''}</td><td>${d.elig ? '<span class="badge b-green">Yes</span>' : '<span class="badge b-red">No</span>'}</td><td class="fine">${esc(d.reason)} ${!d.elig ? whyBtn((d.related ? 'related:' : 'aged:') + c.id) : ''}</td><td class="r num">${inr(d.eligAmt)}</td><td><a href="#" onclick="A.src(${c.fields.find(f => f.key === 'debtorTotal').page - (c.pages.some(p => p.type === 'Debtor Ageing Schedule') ? 1 : 0)},'table');return false">p.${c.fields.find(f => f.key === 'debtorTotal').page - (c.pages.some(p => p.type === 'Debtor Ageing Schedule') ? 1 : 0)}</a></td></tr>`).join('')}
    <tr class="tot"><td colspan="4">Total</td><td class="r num">${inr(k.grossRec)}</td><td></td><td></td><td></td><td class="r num">${inr(k.eligibleRec)}</td><td></td></tr></tbody></table></div></div>`;
  }
  if (sub === 'creditors') b = `<div class="card flush"><div class="card-h"><h3>Creditors</h3><span class="muted fine">CAM: ${c.cam.deductCreditors ? 'deduct unpaid stock creditors' : 'no deduction'} (${CLAUSE.cred})</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Creditor</th><th class="r">Amount</th><th>Unpaid stock related?</th><th class="r">Eligible deduction</th><th>Source</th><th>Status</th></tr></thead><tbody>
    ${k.creds.map(x => `<tr><td>${esc(x.name)}</td><td class="r num">${inr(x.amt)}</td><td>${x.stock ? 'Yes' : 'No'}</td><td class="r num">${inr(x.ded)}</td><td><a href="#" onclick="A.src(${c.fields.find(f => f.key === 'credTotal').page},'table');return false">p.${c.fields.find(f => f.key === 'credTotal').page}</a></td><td>${x.stock && !x.custDed ? '<span class="badge b-red">Not deducted by customer</span>' : `<span class="muted">${x.status}</span>`}</td></tr>`).join('')}
    <tr class="tot"><td>Total</td><td class="r num">${inr(sum(k.creds.map(x => x.amt)))}</td><td></td><td class="r num">${inr(k.creditors)}</td><td></td><td></td></tr></tbody></table></div></div>`;
  if (sub === 'bank'){ const multi = c.bId === 'B011';
    b = `<div class="card flush"><div class="tscroll"><table class="tbl"><thead><tr><th>Bank</th><th>Facility</th><th class="r">Sanctioned</th><th class="r">Outstanding</th><th class="r">Available limit</th><th class="r">DP</th></tr></thead><tbody>
      <tr><td>Our bank</td><td>${c.cam.facility}</td><td class="r num">${cr(c.sanction)}</td><td class="r num">${cr(c.cbsOutstanding)}</td><td class="r num">${cr(c.operative - c.cbsOutstanding)}</td><td class="r num">${cr(k.recommended)}</td></tr>
      ${multi ? `<tr><td>Punjab National Bank</td><td>Cash Credit</td><td class="r num">₹6.00 Cr</td><td class="r num">₹5.40 Cr</td><td class="r num">₹0.60 Cr</td><td class="r num muted">Not shared</td></tr>` : ''}
    </tbody></table></div><div class="pad">${kv([['Other banking exposure', multi ? '₹6.00 Cr with PNB' : 'None declared'], ['Arrangement', multi ? 'Multiple banking — no pari-passu DP sharing' : 'Sole banking'], ['Outstanding source', 'Core banking (as of 21-Sep-2026 EOD)']])}</div></div>`; }
  if (sub === 'decl'){ const dec = DocumentIntelligenceService.detectDeclaration(c), sig = DocumentIntelligenceService.detectSignature(c);
    b = `<div class="card">${kv([['Ownership & charge declaration', badge(dec.status)], ['Insurance declaration', badge(dec.status === 'FAIL' ? 'FAIL' : 'PASS')], ['Related-party disclosure', c.debtors.some(d => d.related) ? 'Disclosed: ' + esc(c.debtors.find(d => d.related).name) : 'None disclosed'], ['Signatures on mandatory pages', badge(sig.status) + (sig.missing.length ? ' page ' + sig.missing.join(', ') : '')], ['Signatory', 'Authorised signatory per board resolution on file']])}</div>`; }
  if (sub === 'supp') b = `<div class="card">${c.priorVersion ? `<h3>Revised submission</h3><p>Version 2 received ${fmtDT(c.receivedAt)} supersedes version 1 received ${fmtDT(c.priorVersion.received)}.</p>${kv([['v1 total stock', cr(L(c.priorVersion.stockTotal * 100))], ['v2 total stock', cr(c.stockTotalRep)], ['Change', cr(c.stockTotalRep - L(c.priorVersion.stockTotal * 100))], ['Reason stated', esc(c.priorVersion.reason)]])}<hr>` : ''}
    <h3>Annexures</h3><ul class="plain">${c.pages.filter(p => p.type.startsWith('Annexure')).map(p => `<li><a href="#" onclick="A.src(${p.n},'table');return false">${esc(p.type)}${p.span ? ' (pages ' + p.span[0] + '–' + p.span[1] + ')' : ''}</a> · confidence ${p.conf}%</li>`).join('') || '<li class="muted">None</li>'}</ul></div>`;
  return `<nav class="subtabs">${subs.map(([s, l]) => `<button class="${s === sub ? 'on' : ''}" onclick="A.sub('${s}')">${l}</button>`).join('')}</nav>${b}`;
}

/* ---------- Arithmetic ---------- */
function tArith(c){
  const ar = CRE.arithmeticChecks(c), tot = ar.find(a => a.id === 'AR-STK-TOT'), k = CRE.calculateDP(c);
  const d = Math.abs(tot.diff), impact = Math.round(d * (100 - c.cam.stockMargin) / 100);
  const causes = ar.filter(a => a.id.startsWith('AR-ROW') && a.status === 'MISMATCH');
  const ruleMap = [['Row totals', 'AR-ROW'], ['Column totals', 'AR-STK-COL'], ['Sub-totals', 'AR-ROW'], ['Grand totals', 'AR-STK-TOT'], ['Cross-page totals', 'AR-ROW'], ['Debtor schedules', 'AR-DEB'], ['Creditor schedules', 'AR-CRD'], ['Summary reconciliation', 'AR-STK-TOT']];
  const stOf = pre => { const rel = ar.filter(a => a.id.startsWith(pre)); if (!rel.length) return 'PASS'; return rel.some(a => a.status === 'MISMATCH') ? 'MISMATCH' : rel.some(a => a.status === 'PENDING') ? 'PENDING' : 'PASS'; };
  return `<div class="grid-ar">
    <div class="card ar-head"><h3>Stock total</h3><div class="ar-figs"><div><span>Customer reported</span><b class="num">${tot.pending ? '—' : inr(tot.reported)}</b></div><div><span>System recalculated</span><b class="num">${inr(tot.system)}</b></div><div><span>Difference</span><b class="num ${d ? 'neg' : ''}">${tot.pending ? '—' : inr(d)}</b></div><div><span>Status</span>${badge(tot.status)}</div></div>
      ${tot.status === 'MISMATCH' ? `<p class="fine">${causes.length ? 'Caused by: ' + causes.map(x => esc(x.desc.split(':')[0]) + ' carried at ' + inr(x.reported) + ' against a schedule total of ' + inr(x.system)).join('; ') + '.' : 'Every line item agrees with its schedule; the difference arises in the footing of the column total on page 1.'}</p>` : tot.pending ? '<p class="fine">Waiting for the stock total to be validated in Document intelligence.</p>' : ''}</div>
    <div class="card ar-imp"><h3>Financial impact on DP</h3>${kv([['Arithmetic error', inr(d)], ['Stock margin', c.cam.stockMargin + '%'], ['Potential DP impact', `<b class="num ${d ? 'neg' : ''}">${inr(impact)}</b>`]])}<p class="fine muted">DP is always computed from system-recalculated line items, so an over-footed total cannot inflate drawing power.</p></div>
  </div>
  <div class="card flush"><div class="card-h"><h3>Validation checks</h3><span class="fine muted">Tolerance ${inr(ST.cfg.arithTol)} (rule VAL-ARI-001) · deterministic, no confidence score</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Check</th><th>Rule</th><th>What is compared</th><th class="r">Reported</th><th class="r">Recalculated</th><th class="r">Difference</th><th>Status</th><th>Source</th></tr></thead><tbody>
  ${ar.map(a => `<tr class="${a.status === 'MISMATCH' ? 'inel' : ''}"><td>${a.id}</td><td>${a.rule}</td><td>${esc(a.desc)}${a.lines ? `<div class="lines">${a.lines.map(l => `<span>${esc(l.name)} <b class="num">${inr(l.amt)}</b></span>`).join('')}</div>` : ''}</td><td class="r num">${a.pending ? '—' : inr(a.reported)}</td><td class="r num">${inr(a.system)}</td><td class="r num">${a.pending ? '—' : inr(a.diff)}</td><td>${badge(a.status)}</td><td><a href="#" onclick="A.src(${a.page},'${a.page === 1 ? 'total' : 'table'}');return false">p.${a.page}</a></td></tr>`).join('')}
  </tbody></table></div></div>
  ${c.stock.every(r => !r.sub) && tot.status === 'MISMATCH' ? `<div class="card flush"><div class="card-h"><h3>Source rows — Stock Summary, page 1</h3></div><table class="tbl"><thead><tr><th>Row</th><th class="r">Customer reported</th><th class="r">System</th></tr></thead><tbody>${c.stock.map(r => `<tr><td>${r.cat}</td><td class="r num">${inr(r.rep)}</td><td class="r num">${inr(r.rep)}</td></tr>`).join('')}<tr class="tot"><td>Σ rows</td><td class="r num">${inr(tot.reported)} <span class="muted">(as footed)</span></td><td class="r num">${inr(tot.system)}</td></tr></tbody></table></div>` : ''}
  <div class="card"><h3>Arithmetic rule coverage</h3><div class="cover">${ruleMap.map(([l, pre]) => `<div><span>${l}</span>${badge(stOf(pre))}</div>`).join('')}</div></div>`;
}

/* ---------- CAM terms ---------- */
function tCam(c, compact = false){
  const m = c.cam;
  const terms = [['Facility', m.facility], ['Sanctioned limit', cr(c.sanction)], ['Stock margin', m.stockMargin + '%'], ['Receivable margin', m.recMargin + '%'], ['Eligible receivable age', '≤' + m.recAge + ' days'],
    ['Creditors treatment', m.deductCreditors ? 'Deduct unpaid stock creditors' : 'No deduction'], ['Stock eligibility', 'RM / WIP / FG / Packing / Stores & Spares'], ['Goods in transit', m.gitEligible ? 'Eligible' : 'Not eligible'],
    ['Related-party receivables', m.excludeRelated ? 'Not eligible' : 'Eligible'], ['Maximum DP', 'Sanctioned limit']];
  const card = `<div class="card"><div class="card-h"><h3>Facility terms</h3><span class="fine muted">Extracted from CAM & DN by Prism IDP · verified by Credit Admin on ${fmtD(new Date(m.dnDate).getTime() + 2 * DAY)}</span></div>${kv(terms.map(([a, b2]) => [a, esc(b2)]), 'kv2')}</div>`;
  if (compact) return card;
  return `<div class="grid2">${card}<div class="card"><h3>Document control</h3>${kv([['CAM effective date', fmtD(new Date(m.camDate).getTime())], ['DN effective date', fmtD(new Date(m.dnDate).getTime())], ['Latest amendment', m.amendment], ['Version', m.version], ['Approval reference', m.approvalRef]])}
    <h3 style="margin-top:18px">Governing clauses</h3><ul class="clauses">
      <li><b>${CLAUSE.elig}</b> Stock eligible for DP: raw material, WIP, finished goods, packing material and stores & spares held at borrower premises.</li>
      <li><b>${CLAUSE.margin}</b> Margin of ${m.stockMargin}% on net eligible stock and ${m.recMargin}% on eligible receivables.</li>
      <li><b>${CLAUSE.age}</b> Receivables above ${m.recAge} days are not eligible for drawing power. Ageing is reckoned from invoice date, or from buyer acceptance where acceptance is evidenced.</li>
      <li><b>${CLAUSE.related}</b> Receivables from associate or group concerns are excluded.</li>
      <li><b>${CLAUSE.cred}</b> Unpaid creditors for stock are deducted from eligible stock before margin.</li>
      <li><b>${CLAUSE.git}</b> Goods in transit are not eligible.</li>
      <li><b>${CLAUSE.cap}</b> Operative limit shall be the lower of drawing power and the sanctioned limit.</li>
      <li><b>${CLAUSE.submit}</b> Monthly statement within 20 days of month end, signed and stamped, with declaration.</li></ul></div></div>`;
}

/* ---------- CAM vs statement ---------- */
function compareRows(c){
  const k = CRE.calculateDP(c), m = c.cam, rows = [];
  const initialOver = sum(c.debtors.filter(d => !d.related && d.age > m.recAge).map(d => d.amt));
  const rel = sum(c.debtors.filter(d => d.related).map(d => d.amt));
  const git = sum(c.stock.filter(r => r.cat === 'Goods in Transit').map(r => r.rep));
  const reqCred = sum(c.creditors.filter(x => x.stock).map(x => x.amt));
  const keep = (v, p) => Math.round(v * (100 - p) / 100);
  rows.push({ p: 'Receivable age', req: '≤' + m.recAge + ' days', st: initialOver ? 'Includes ' + lk(initialOver) + ' > ' + m.recAge + ' days' : 'All within ' + m.recAge + ' days', res: initialOver ? 'FAIL' : 'PASS', imp: initialOver ? lk(k.overaged) + ' excluded' : '—', why: initialOver ? 'aged:' + c.id : '' });
  rows.push({ p: 'Related-party receivables', req: 'Not eligible', st: rel ? lk(rel) + ' included' : 'None', res: rel ? 'FAIL' : 'PASS', imp: rel ? lk(rel) + ' excluded' : '—', why: rel ? 'related:' + c.id : '' });
  rows.push({ p: 'Stock margin', req: m.stockMargin + '%', st: c.custSM + '%', res: c.custSM === m.stockMargin ? 'PASS' : 'FAIL', imp: c.custSM === m.stockMargin ? '—' : lk(Math.round(k.netStock * (m.stockMargin - c.custSM) / 100)) + ' additional margin' });
  rows.push({ p: 'Receivable margin', req: m.recMargin + '%', st: c.custRM + '%', res: c.custRM === m.recMargin ? 'PASS' : 'FAIL', imp: '—' });
  rows.push({ p: 'Creditors', req: 'Deduct unpaid stock creditors', st: c.custDed < reqCred ? lk(reqCred - c.custDed) + ' creditors not deducted' : 'All deducted (' + cr(c.custDed) + ')', res: c.custDed < reqCred ? 'FAIL' : 'PASS', imp: c.custDed < reqCred ? lk(reqCred - c.custDed) + ' deduction' : '—', why: c.custDed < reqCred ? 'cred:' + c.id : '' });
  rows.push({ p: 'Goods in transit', req: m.gitEligible ? 'Eligible' : 'Not eligible', st: git ? lk(git) + ' included' : 'None', res: git && !m.gitEligible ? 'FAIL' : 'PASS', imp: git && !m.gitEligible ? lk(git) + ' excluded' : '—', why: git ? 'git:' + c.id : '' });
  rows.push({ p: 'Sanctioned limit', req: cr(c.sanction), st: cr(fieldVal(c, 'sanction')), res: fieldVal(c, 'sanction') === c.sanction ? 'PASS' : 'FAIL', imp: '—' });
  const os = fieldVal(c, 'outstanding'), osPend = isPending(c, 'outstanding');
  rows.push({ p: 'Outstanding vs core banking', req: cr(c.cbsOutstanding) + ' (CBS)', st: osPend ? 'Pending validation' : cr(os), res: osPend ? 'REVIEW' : Math.abs(os - c.cbsOutstanding) <= ST.cfg.arithTol ? 'PASS' : 'FAIL', imp: '—' });
  const sdp = Math.round((fieldVal(c, 'stockTotal') - c.custDed) * (100 - c.custSM) / 100) + Math.round(fieldVal(c, 'debtorTotal') * (100 - c.custRM) / 100);
  rows.push({ p: 'Drawing power', req: 'Per CAM formula: ' + cr(k.calculatedDP), st: 'Borrower claims ' + cr(sdp), res: Math.abs(sdp - k.calculatedDP) <= ST.cfg.arithTol ? 'PASS' : 'FAIL', imp: sdp !== k.calculatedDP ? cr(sdp - k.calculatedDP) + ' overstated' : '—', why: 'limit:' + c.id });
  rows.push({ p: 'Submission timeliness', req: 'Within 20 days of month end', st: 'Received ' + fmtD(c.receivedAt), res: c.receivedAt <= c.dueDate ? 'PASS' : 'FAIL', imp: '—' });
  return rows;
}
function tCompare(c){
  const rows = compareRows(c);
  return `<div class="card flush"><div class="card-h"><h3>CAM/DN requirement vs stock statement</h3><span class="fine muted">${rows.filter(r => r.res === 'FAIL').length} variance(s) · ${rows.filter(r => r.res === 'PASS').length} compliant</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Parameter</th><th>CAM/DN requirement</th><th>Stock statement</th><th>Result</th><th>Financial impact</th><th></th></tr></thead><tbody>
  ${rows.map(r => `<tr class="${r.res === 'FAIL' ? 'inel' : ''}"><td><b>${r.p}</b></td><td>${esc(r.req)}</td><td>${esc(r.st)}</td><td>${badge(r.res)}</td><td class="num">${esc(r.imp)}</td><td>${r.why ? whyBtn(r.why) : ''}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}

/* ---------- Exceptions ---------- */
function tExceptions(c){
  if (!c.excs.length) return emptyState('No exceptions', 'This statement passed every document, arithmetic and CAM/DN check.', `<button class="btn primary" onclick="A.tab('dp')">Review drawing power</button>`);
  const sel = c.excs.find(e => e.id === ST.ui.ex) || c.excs.find(e => ['Open', 'Sent to RM', 'RM Responded'].includes(e.status)) || c.excs[0];
  const rmOpen = c.excs.filter(e => e.status === 'Open' && e.rmReq);
  const order = ['Critical', 'High', 'Medium', 'Low'];
  const list = [...c.excs].sort((a, b) => (['Resolved', 'Auto-cleared'].includes(a.status) - ['Resolved', 'Auto-cleared'].includes(b.status)) || order.indexOf(a.sev) - order.indexOf(b.sev));
  return `<div class="ex-ws"><div class="ex-list card flush">
    <div class="card-h"><h3>${c.excs.length} exceptions</h3>${rmOpen.length && can('analyst') ? `<button class="btn sm primary" onclick="A.sendAllRM('${c.id}')">${icon('send', 13)} Send ${rmOpen.length} to RM</button>` : ''}</div>
    ${list.map(e => { const v = exView(c, e); return `<button class="ex-item ${e.id === sel.id ? 'on' : ''}" onclick="A.selEx('${e.id}')">${sevDot(e.sev)}<div><div class="ex-t">${esc(e.title)}</div><div class="fine muted">${e.id} · ${e.cat}${v.impact ? ' · ' + amt(v.impact) : ''}</div></div>${badge(e.status)}</button>`; }).join('')}
  </div><div class="ex-detail">${exDetail(c, sel)}</div></div>`;
}
function exDetail(c, e){
  const v = exView(c, e);
  const steps = ['Raised', 'Sent to RM', 'RM Viewed', 'RM Responded', 'Credit Review', 'Resolved'];
  const reached = new Set(e.trail.map(t => t.s)); if (e.status === 'RM Responded') reached.add('Credit Review'); if (e.status === 'Resolved' && !e.rmReq) { reached.add('Credit Review'); }
  const tl = e.rmReq || e.sentAt ? `<ol class="ex-tl">${steps.map(s => { const t = e.trail.filter(x => x.s === s).pop(); return `<li class="${reached.has(s) ? 'done' : ''}"><span>${s}</span>${t ? `<em>${fmtDTs(t.ts)}</em>` : ''}</li>`; }).join('')}</ol>` : '';
  let sla = '';
  if (e.status === 'Sent to RM'){ const left = e.dueAt - SIM_NOW; sla = `<div class="sla-box ${left < 0 ? 'br' : left < ST.cfg.sla.reminder * HR ? 'wr' : ''}">${icon('clock', 15)} ${left < 0 ? 'SLA breached by ' + dur(-left) : 'Due in ' + hm(left)} <span class="muted">· RM ${esc(c.bor.rm)} · due ${fmtDT(e.dueAt)}</span></div>`; }
  let actions = '';
  const ro = ST.role === 'auditor';
  if (e.status === 'Open' && can('analyst')) actions = `<div class="acts">${e.rmReq ? `<button class="btn primary" onclick="A.sendRM('${e.id}')">${icon('send', 14)} Send to RM</button>` : ''}
    <button class="btn ${e.rmReq ? '' : 'primary'}" onclick="A.acceptSys('${e.id}')">Accept system treatment</button>${OVERRIDABLE.includes(e.key) ? `<button class="btn ghost" onclick="A.override('${e.id}')">Override</button>` : ''}
    <button class="btn ghost" onclick="A.comment('${e.id}')">Add comment</button><button class="btn ghost" onclick="A.src(${e.page},'${regionFor(e)}')">${icon('eye', 14)} View evidence</button></div>`;
  else if (e.status === 'Open') actions = `<div class="acts">${roleGate('analyst', 'Actions available to Credit Analyst')}<button class="btn ghost" onclick="A.src(${e.page},'${regionFor(e)}')">${icon('eye', 14)} View evidence</button></div>`;
  let rmBlock = '';
  if (e.status === 'Sent to RM' && can('rm')){
    const seed = c.rmSeed[e.key] || { text: '', files: [] };
    const files = (e._draftFiles || []);
    rmBlock = `<div class="card inset"><h4>Your response to credit</h4>
      <label class="lbl">Clarification</label><textarea id="rm-text" rows="4" placeholder="Explain the position and what evidence you are attaching">${esc(e._draftText ?? seed.text)}</textarea>
      ${e.key === 'OVERAGED' ? `<label class="lbl">Amount claimed as eligible (₹ lakh)</label><input id="rm-claim" type="number" step="0.5" value="${seed.claim ?? ''}" placeholder="e.g. 12.5">` : ''}
      <label class="lbl">Evidence</label><div class="files">${files.map(f => `<span class="file">${icon('file', 13)} ${esc(f)}</span>`).join('') || '<span class="muted fine">No files attached</span>'}</div>
      <div class="acts"><button class="btn sm" onclick="A.rmAttach('${e.id}')">${icon('upload', 13)} Attach evidence</button></div>
      <div class="acts"><button class="btn primary" onclick="A.rmSubmit('${e.id}')">${icon('send', 14)} Submit response</button><button class="btn ghost" onclick="A.rmExtend('${e.id}')">Request 24h extension</button></div></div>`;
  } else if (e.status === 'Sent to RM') rmBlock = `<div class="card inset"><p class="muted">Awaiting response from ${esc(c.bor.rm)}.</p>${roleGate('rm', 'Response by Relationship Manager')}</div>`;
  if (e.rm) rmBlock += `<div class="card inset rmr"><h4>RM response · ${esc(e.rm.by)} · ${fmtDT(e.rm.ts)}</h4><p>${esc(e.rm.text)}</p>${e.rm.claim ? `<p class="fine">Amount claimed eligible: <b>${lk(e.rm.claim)}</b></p>` : ''}<div class="files">${(e.rm.files || []).map(f => `<span class="file">${icon('file', 13)} ${esc(f)}</span>`).join('')}</div></div>`;
  if (e.status === 'RM Responded' && can('analyst')){
    const claim = e.rm.claim ? e.rm.claim / 1e5 : '';
    rmBlock += `<div class="card inset"><h4>Credit review of RM response</h4>
      <div class="seg" role="radiogroup">${['Accept', 'Partially accept', 'Reject', 'Seek clarification'].map((x, i) => `<label><input type="radio" name="dec" value="${x}" ${i === (e.key === 'OVERAGED' ? 1 : 0) ? 'checked' : ''} onchange="A.decType(this.value)"> ${x}</label>`).join('')}</div>
      <div id="partial" style="${e.key === 'OVERAGED' ? '' : 'display:none'}" class="partial"><div><label class="lbl">Customer claim (₹ lakh)</label><input id="d-claim" type="number" value="${claim}" readonly></div><div><label class="lbl">Accepted (₹ lakh)</label><input id="d-acc" type="number" step="0.5" value="${e.key === 'OVERAGED' ? 10 : ''}" oninput="document.getElementById('d-rej').value=(+document.getElementById('d-claim').value - +this.value).toFixed(2)"></div><div><label class="lbl">Rejected (₹ lakh)</label><input id="d-rej" type="number" value="${e.key === 'OVERAGED' ? '2.50' : ''}" readonly></div></div>
      <label class="lbl">Reason</label><textarea id="d-reason" rows="2">${e.key === 'OVERAGED' ? 'GRN acceptance evidenced only for INV-A1051 (₹10 lakh). INV-A1052 acceptance note is illegible and undated.' : 'Clarification is consistent with CAM terms and supporting evidence.'}</textarea>
      <div class="acts"><button class="btn primary" onclick="A.decide('${e.id}')">Record decision</button></div><p class="fine muted">Accepted values flow straight into the DP calculation.</p></div>`;
  } else if (e.status === 'RM Responded') rmBlock += `<div class="card inset">${roleGate('analyst', 'Review by Credit Analyst')}</div>`;
  const dec = e.decision ? `<div class="card inset dec"><h4>${esc(e.decision.type)} · ${esc(e.decision.by)} · ${fmtDT(e.decision.ts)}</h4>${e.decision.accepted != null ? `<p class="fine">Claim ${lk(e.decision.claim)} · accepted ${lk(e.decision.accepted)} · rejected ${lk(e.decision.claim - e.decision.accepted)}</p>` : ''}<p>${esc(e.decision.reason || '')}</p></div>` : '';
  const comments = e.comments.length ? `<div class="comments">${e.comments.map(x => `<div><b>${esc(x.by)}</b> <span class="muted fine">${fmtDT(x.ts)}</span><p>${esc(x.text)}</p></div>`).join('')}</div>` : '';
  return `<div class="card"><div class="exd-h"><div><span class="fine muted">${e.id}</span><h2>${esc(e.title)}</h2><div class="chips">${badge(e.sev)} ${badge(e.status)} <span class="tag">${e.cat}</span>${e.rmReq ? '<span class="tag">RM action required</span>' : ''}</div></div>
      <div class="exd-imp"><span>Potential DP impact</span><b class="num ${v.impact ? 'neg' : ''}">${v.impact == null ? '—' : v.impact ? amt(v.impact) : 'None'}</b><em class="fine muted">${esc(v.impactNote || '')}</em></div></div>
    ${tl}${sla}
    <div class="exd-grid">
      <div><span>CAM requirement</span><p>${esc(v.camReq)}</p></div>
      <div><span>Customer statement</span><p>${esc(v.cust)}</p></div>
      <div><span>System treatment</span><p>${esc(v.sys)}</p></div>
      <div><span>Evidence</span><p><a href="#" onclick="A.src(${e.page},'${regionFor(e)}');return false">Stock statement page ${e.page}</a></p></div>
      <div><span>CAM clause</span><p>${v.clause} · rule ${v.rule}</p></div>
      <div><span>Raised</span><p>${fmtDT(e.createdAt)} by Credit Rule Engine</p></div>
    </div>${actions}</div>${rmBlock}${dec}${comments}`;
}
function regionFor(e){ return ({ SIGNATURE: 'signature', STAMP: 'stamp', DECLARATION: 'declaration', OS_MISMATCH: 'outstanding', DP_BELOW_OS: 'outstanding', MARGIN: 'table', ARITH_STOCK: 'total', ARITH_DEBT: 'total', ARITH_CRED: 'total' })[e.key] || 'table'; }

/* ---------- Drawing power ---------- */
function dpSheetRows(c, k){
  const f = c.fields.find(x => x.key === 'debtorTotal'), stk = CRE.arithmeticChecks(c).find(a => a.id === 'AR-STK-TOT');
  const reaged = c.debtors.filter(d => d.acceptedAge != null);
  const credPg = c.fields.find(x => x.key === 'credTotal').page;
  return [
    { id: 'gs', l: 'Gross stock', v: k.grossStock, src: 'Stock Summary + Inventory Details', pg: '1–2', rule: 'VAL-ARI-001', adj: stk.diff ? 'Recalculated from schedules (' + inr(-stk.diff) + ' vs customer total)' : 'None', calc: 'Σ recalculated line items', t: 'total', items: k.rows.map(r => [r.cat, r.recalc]) },
    { id: 'is', l: 'Less: ineligible stock', v: k.ineligibleStock, src: 'Stock Summary', pg: '1', rule: 'DP-STK-001/002', adj: k.ineligibleStock ? 'Goods in transit excluded' : 'None', calc: 'Σ ineligible categories', t: 'minus', items: k.rows.filter(r => !r.elig).map(r => [r.cat, r.recalc]) },
    { id: 'es', l: 'Eligible stock', v: k.eligibleStock, calc: 'Gross − ineligible', t: 'sub' },
    { id: 'cr', l: 'Less: unpaid stock creditors', v: k.creditors, src: 'Creditor Details', pg: String(credPg), rule: 'DP-CRD-001', adj: k.creditors > c.custDed ? '+' + inr(k.creditors - c.custDed) + ' vs customer working' : 'None', calc: 'Σ stock-related creditors', t: 'minus', items: k.creds.filter(x => x.ded).map(x => [x.name, x.ded]) },
    { id: 'ns', l: 'Net eligible stock', v: k.netStock, calc: 'Eligible stock − creditors', t: 'sub' },
    { id: 'sm', l: 'Less: stock margin ' + k.stockMarginPct + '%', v: k.stockMarginAmt, src: 'CAM', pg: CLAUSE.margin, rule: 'DP-STK-003', adj: 'None', calc: inr(k.netStock) + ' × ' + k.stockMarginPct + '%', t: 'minus' },
    { id: 'sd', l: 'Stock DP', v: k.stockDP, calc: 'Net stock − margin', t: 'sub', hi: true },
    { id: 'gr', l: 'Gross receivables', v: k.grossRec, src: 'Debtor Ageing Summary', pg: String(f.page), rule: 'VAL-CNF-001', adj: f.reviewed && f.validated !== f.extracted ? 'OCR ' + inr(f.extracted) + ' corrected to ' + inr(f.validated) + ' by ' + f.by : f.reviewed ? 'Validated by ' + f.by : 'Auto-accepted', calc: 'Σ invoice schedule', t: 'total' },
    { id: 'oa', l: 'Less: receivables > ' + c.cam.recAge + ' days', v: k.overaged, src: 'Debtor Ageing Schedule', pg: String(f.page - 1 || f.page), rule: 'DP-REC-001', adj: reaged.length ? reaged.map(d => d.inv + ' re-aged to ' + d.acceptedAge + ' days (' + lk(d.amt) + ')').join('; ') : 'None', calc: 'Σ invoices aged > ' + c.cam.recAge, t: 'minus', items: k.debts.filter(d => !d.elig && !d.related).map(d => [d.name + ' · ' + d.inv + ' · ' + d.effAge + 'd', d.amt]) },
    { id: 'rp', l: 'Less: related-party receivables', v: k.related, src: 'Debtor schedule / declaration', pg: String(f.page), rule: 'DP-REC-002', adj: 'None', calc: 'Σ related-party invoices', t: 'minus', items: k.debts.filter(d => d.related).map(d => [d.name, d.amt]) },
    { id: 'er', l: 'Eligible receivables', v: k.eligibleRec, calc: 'Gross − ineligible', t: 'sub' },
    { id: 'rm', l: 'Less: receivable margin ' + k.recMarginPct + '%', v: k.recMarginAmt, src: 'CAM', pg: CLAUSE.margin, rule: 'DP-REC-003', adj: 'None', calc: inr(k.eligibleRec) + ' × ' + k.recMarginPct + '%', t: 'minus' },
    { id: 'rd', l: 'Receivable DP', v: k.recDP, calc: 'Eligible receivables − margin', t: 'sub', hi: true },
    { id: 'td', l: 'Total drawing power', v: k.calculatedDP, calc: 'Stock DP + receivable DP', t: 'grand' },
    { id: 'sl', l: 'Sanctioned limit', v: k.sanction, src: 'CAM / DN', pg: CLAUSE.cap, rule: 'DP-CAP-001', calc: 'As sanctioned', t: 'info' },
    { id: 'ro', l: 'Recommended operative limit', v: k.recommended, calc: 'MIN(' + cr(k.calculatedDP) + ', ' + cr(k.sanction) + ')', rule: 'DP-CAP-001', t: 'grand' },
    { id: 'eo', l: 'Existing operative limit', v: k.existing, src: 'Core banking', t: 'info' },
    { id: 'ch', l: k.change < 0 ? 'Recommended reduction' : 'Recommended increase', v: Math.abs(k.change), calc: 'Recommended − existing', t: 'info' },
  ];
}
function tDP(c){
  const k = CRE.calculateDP(c), st = caseStatus(c), rows = dpSheetRows(c, k), exp = ST.ui.dpExp || {};
  const steps = [{ l: 'Gross stock', v: k.grossStock, t: 'start' }, { l: 'Ineligible stock', v: k.ineligibleStock, t: 'minus' }, { l: 'Unpaid creditors', v: k.creditors, t: 'minus' }, { l: 'Stock margin', v: k.stockMarginAmt, t: 'minus' },
    { l: 'Stock DP', v: k.stockDP, t: 'total' }, { l: 'Eligible receivables', v: k.eligibleRec, t: 'plus' }, { l: 'Receivable margin', v: k.recMarginAmt, t: 'minus' }, { l: 'Total DP', v: k.calculatedDP, t: 'total', hi: true }];
  const blockers = [...pendingFields(c).map(f => 'Validate ' + f.name + ' (' + f.conf + '%)'), ...openExcs(c).map(e => e.id + ' ' + e.title + ' — ' + e.status)];
  let submit = '';
  if (['Ready for DP', 'Credit Review', 'Exception Review', 'Validation Review', 'Awaiting RM', 'RM Responded'].includes(st)){
    if (!can('analyst')) submit = `<div class="card">${roleGate('analyst', 'Submission by Credit Analyst (maker)')}</div>`;
    else if (blockers.length) submit = `<div class="card"><h3>Submit for approval</h3><p class="muted">Settle these before DP can go to the checker:</p><ul class="plain blk">${blockers.map(b => `<li>${icon('alert', 13)} ${esc(b)}</li>`).join('')}</ul></div>`;
    else { const lvl = approvalLevel(Math.abs(k.change));
      submit = `<div class="card sub-card"><h3>Submit for approval</h3>${c.returned && c.approvals?.length ? `<div class="warnline">${icon('alert', 14)} Returned by checker: “${esc(c.approvals[c.approvals.length - 1].comments)}”</div>` : ''}
        <label class="lbl">Analyst recommendation</label><textarea id="rec" rows="3">Recommend revising the operative limit from ${cr(c.operative)} to ${cr(k.recommended)} in line with CAM-compliant drawing power for ${c.month}.${k.shortfall ? ' Outstanding exceeds DP by ' + lk(k.shortfall) + '; RM to obtain regularisation plan within 7 days.' : ''}</textarea>
        <div class="acts"><button class="btn primary" onclick="A.submitDP('${c.id}')">Submit for approval</button><span class="fine muted">Routes to ${lvl.who} (${lvl.rule})</span></div></div>`; }
  } else if (c.submission) submit = `<div class="card"><h3>Submitted for approval</h3>${kv([['Maker', esc(c.submission.by)], ['Submitted', fmtDT(c.submission.ts)], ['DP submitted', cr(c.submission.dp)], ['Recommendation', esc(c.submission.rec)]])}</div>`;
  const sim = ST.ui.sim;
  return `<div class="dp-top">
      <div class="dpk"><span>Calculated DP</span><b class="num">${cr(k.calculatedDP)}</b></div><div class="dpk"><span>Sanctioned limit</span><b class="num">${cr(k.sanction)}</b></div>
      <div class="dpk main"><span>Recommended operative limit</span><b class="num">${cr(k.recommended)}</b><em>MIN(calculated DP, sanction)</em></div>
      <div class="dpk"><span>Existing operative limit</span><b class="num">${cr(k.existing)}</b></div><div class="dpk"><span>${k.change < 0 ? 'Reduction' : 'Increase'}</span><b class="num ${k.change < 0 ? 'neg' : 'pos'}">${cr(Math.abs(k.change))}</b>${whyBtn('limit:' + c.id)}</div>
    </div>
    <div class="card"><div class="card-h"><h3>Calculation waterfall</h3><div class="acts"><button class="btn sm" onclick="A.lineage('${c.id}','rec')">${icon('layers', 13)} View calculation lineage</button><button class="btn sm ${sim ? 'primary' : ''}" onclick="A.toggleSim()">${icon('sliders', 13)} What-if simulation</button></div></div>${waterfall(steps)}</div>
    ${sim ? simPanel(c) : ''}
    <div class="card flush"><div class="card-h"><h3>DP calculation sheet</h3><span class="fine muted">Deterministic credit rule engine · every input traceable to source</span></div><div class="tscroll"><table class="tbl sheet"><thead><tr><th></th><th>Line</th><th class="r">Value</th><th>Source</th><th>Page</th><th>CAM rule</th><th>Adjustment</th><th>Calculation</th></tr></thead><tbody>
    ${rows.map(r => `<tr class="t-${r.t}${r.hi ? ' hi' : ''}" ${r.items ? `onclick="A.dpExp('${r.id}')" style="cursor:pointer"` : ''}><td>${r.items && r.items.length ? `<span class="chev ${exp[r.id] ? 'open' : ''}">${icon('chev', 12)}</span>` : ''}</td><td>${esc(r.l)}</td><td class="r num">${r.t === 'minus' ? '−' : ''}${inr(r.v)}</td><td>${esc(r.src || '')}</td><td>${r.pg ? (/^\d/.test(r.pg) ? `<a href="#" onclick="event.stopPropagation();A.src(${parseInt(r.pg)},'table');return false">p.${esc(r.pg)}</a>` : esc(r.pg)) : ''}</td><td>${esc(r.rule || '')}</td><td class="fine">${esc(r.adj || '')}</td><td class="fine muted">${esc(r.calc || '')}</td></tr>
      ${exp[r.id] && r.items ? r.items.map(([n, v]) => `<tr class="sub-row"><td></td><td>${esc(n)}</td><td class="r num">${inr(v)}</td><td colspan="5"></td></tr>`).join('') : ''}`).join('')}
    </tbody></table></div></div>${submit}`;
}
function simPanel(c){
  const s = ST.ui.sim, base = CRE.calculateDP(c), k = CRE.calculateDP(c, simArgs(s));
  const delta = k.recommended - base.recommended;
  const maxReal = Math.round(base.overaged / 1e5);
  let story = [];
  if (s.realise) story.push('If ' + lk(L(s.realise)) + ' of overdue debtors is realised and replaced by current receivables');
  if (s.stockAdj) story.push('if stock ' + (s.stockAdj > 0 ? 'rises' : 'falls') + ' by ' + lk(L(Math.abs(s.stockAdj))));
  if (s.sm !== c.cam.stockMargin) story.push('with stock margin at ' + s.sm + '%');
  if (s.rm !== c.cam.recMargin) story.push('with receivable margin at ' + s.rm + '%');
  if (s.cp !== 100) story.push('with ' + s.cp + '% of creditors deducted');
  const sentence = story.length ? story.join(', ').replace(/^./, x => x.toUpperCase()) + ', DP ' + (delta >= 0 ? 'improves' : 'falls') + ' from ' + cr(base.recommended) + ' to ' + cr(k.recommended) + '.' : 'Move a slider to test a scenario.';
  const sl = (id, label, min, max, step, val, fmtv) => `<div class="sl"><label for="s-${id}">${label}<b id="sv-${id}" class="num">${fmtv(val)}</b></label><input type="range" id="s-${id}" min="${min}" max="${max}" step="${step}" value="${val}" oninput="A.simSet('${id}',this.value)"></div>`;
  return `<div class="card sim"><div class="card-h"><h3>What-if simulation</h3><span class="simtag">Simulation only — does not affect approved DP</span></div>
    <div class="sim-grid"><div>
      ${sl('stockAdj', 'Change in gross stock (₹ L)', -200, 200, 5, s.stockAdj, v => (v > 0 ? '+' : '') + v)}
      ${sl('realise', 'Overdue debtors realised (₹ L)', 0, Math.max(maxReal, 5), 2.5, s.realise, v => v)}
      ${sl('sm', 'Stock margin (%)', 10, 40, 1, s.sm, v => v + '%')}
      ${sl('rm', 'Receivable margin (%)', 15, 50, 1, s.rm, v => v + '%')}
      ${sl('cp', 'Creditor deduction (%)', 0, 100, 5, s.cp, v => v + '%')}
      <button class="btn sm ghost" onclick="A.simReset()">Reset</button>
    </div><div class="sim-out"><span>Simulated operative limit</span><b class="num">${cr(k.recommended)}</b><em class="num ${delta < 0 ? 'neg' : delta > 0 ? 'pos' : ''}">${delta >= 0 ? '+' : ''}${cr(delta)} vs current</em><p>${esc(sentence)}</p>
      ${kv([['Stock DP', cr(k.stockDP)], ['Receivable DP', cr(k.recDP)], ['Calculated DP', cr(k.calculatedDP)]])}</div></div></div>`;
}
function simArgs(s){ return { stockAdj: L(s.stockAdj), realise: L(s.realise), stockMargin: s.sm, recMargin: s.rm, credPct: s.cp }; }

/* ---------- Approval ---------- */
function tApproval(c){
  const k = CRE.calculateDP(c), st = caseStatus(c);
  if (!c.submission && !(c.approvals || []).length) return emptyState('Not yet submitted', 'The credit analyst submits DP for approval once exceptions are settled.', `<button class="btn" onclick="A.tab('dp')">Go to drawing power</button>`);
  const lvl = approvalLevel(Math.abs(k.change)), ovr = c.excs.filter(e => e.decision?.type === 'Overridden');
  const key = c.excs.filter(e => e.status === 'Resolved' || e.status === 'Auto-cleared');
  const rmc = c.excs.filter(e => e.rm);
  let act = '';
  if (st === 'Awaiting Approval'){
    if (can('checker')) act = `<div class="card sub-card"><h3>Checker decision</h3><p class="fine">Maker ${esc(c.submission.by)} · Checker ${esc(ROLES.checker.name)} — maker-checker segregation enforced.</p>
      <label class="lbl">Comments ${ovr.length ? '(mandatory — case contains overrides)' : '(mandatory for reject, send back or clarification)'}</label><textarea id="ap-c" rows="3" placeholder="Record the basis for your decision">${ovr.length ? '' : 'DP recomputed per CAM terms; exceptions adequately resolved. Approved.'}</textarea>
      <div class="acts"><button class="btn primary" onclick="A.approve('${c.id}','Approved')">Approve</button><button class="btn danger" onclick="A.approve('${c.id}','Rejected')">Reject</button><button class="btn" onclick="A.approve('${c.id}','Sent back')">Send back</button><button class="btn ghost" onclick="A.approve('${c.id}','Clarification sought')">Seek clarification</button></div></div>`;
    else act = `<div class="card">${roleGate('checker', ST.role === 'analyst' ? 'You are the maker on this case — approval requires a different user (Credit Checker)' : 'Decision by Credit Checker')}</div>`;
  }
  const hist = (c.approvals || []).concat(c.approval ? [c.approval] : []);
  return `<div class="grid2 ap">
    <div class="card"><h3>Approval note</h3>${kv([['Borrower', esc(c.bor.name)], ['Facility', c.cam.facility + ' · sanction ' + cr(c.sanction)], ['Existing limit', cr(c.operative)], ['Calculated DP', cr(k.calculatedDP)], ['Recommended limit', `<b>${cr(k.recommended)}</b>`], ['Limit change', `<span class="${k.change < 0 ? 'neg' : 'pos'}">${k.change >= 0 ? '+' : ''}${cr(k.change)}</span>`], ['Outstanding', cr(c.cbsOutstanding) + (k.shortfall ? ` <span class="neg">(exceeds DP by ${lk(k.shortfall)})</span>` : '')], ['Approval authority', lvl.who + ' · ' + lvl.rule]])}
      <h4>Analyst recommendation</h4><p>${esc(c.submission?.rec || '')}</p></div>
    <div class="card"><h3>Key exceptions</h3><ul class="plain exs">${key.map(e => { const v = exView(c, e); return `<li>${sevDot(e.sev)} <div><b>${esc(e.title)}</b><div class="fine muted">${e.id} · ${esc(e.decision?.type || e.status)}${v.impact ? ' · impact ' + amt(v.impact) : ''}</div></div></li>`; }).join('') || '<li class="muted">None</li>'}</ul>
      <h4>Overrides</h4>${ovr.length ? ovr.map(e => `<p class="warnline">${icon('alert', 13)} ${e.id}: ${esc(e.decision.reason)}</p>`).join('') : '<p class="muted">None — system treatment applied throughout.</p>'}
      <h4>RM clarifications</h4>${rmc.length ? rmc.map(e => `<p class="fine"><b>${e.id}</b> ${esc(e.rm.text.slice(0, 160))}${e.rm.text.length > 160 ? '…' : ''} <span class="muted">→ ${esc(e.decision?.type || 'pending')}</span></p>`).join('') : '<p class="muted">None</p>'}</div>
  </div>${act}${hist.length ? `<div class="card"><h3>Decision history</h3><table class="tbl"><thead><tr><th>When</th><th>Checker</th><th>Level</th><th>Decision</th><th>Comments</th></tr></thead><tbody>${hist.map(a => `<tr><td>${fmtDT(a.ts)}</td><td>${esc(a.by)}</td><td>${a.level}</td><td>${badge(a.decision === 'Approved' ? 'Approved' : 'Credit Review').replace('Credit Review', esc(a.decision))}</td><td>${esc(a.comments)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
}

/* ---------- Limit update ---------- */
function tLimit(c){
  const k = CRE.calculateDP(c), st = caseStatus(c);
  if (!c.approval || c.approval.decision !== 'Approved') return emptyState('Awaiting approval', 'The limit update instruction is generated once the checker approves drawing power.');
  const L0 = c.limit, eff = '30-Sep-2026';
  let act = '';
  if (st !== 'Completed'){
    if (!can('ops')) act = `<div class="card">${roleGate('ops', 'Core banking update by Operations')}</div>`;
    else if (L0?.status === 'PENDING') act = `<div class="card sub-card"><h3>Awaiting core banking acknowledgement</h3><p class="muted">Instruction ${L0.ref} queued at ${fmtDT(L0.ts)}.</p><button class="btn primary" onclick="A.cbsCheck('${c.id}')">${icon('refresh', 14)} Check status</button></div>`;
    else if (L0?.status === 'MANUAL') act = `<div class="card sub-card"><h3>Manual processing required</h3><p class="muted">Post the limit maintenance directly in core banking, then record the reference.</p><label class="lbl">Core banking reference</label><input id="man-ref" value="CBS-UL-MAN-${c.id.slice(-3)}"><div class="acts"><button class="btn primary" onclick="A.cbsManual('${c.id}')">Mark limit updated</button></div></div>`;
    else act = `<div class="card sub-card"><h3>${L0?.status === 'FAILED' ? 'Retry core banking update' : 'Send to core banking'}</h3>
      <label class="lbl">Simulated core banking response</label><select id="cbs-sim"><option value="SUCCESS">Success</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option><option value="MANUAL">Manual processing required</option></select>
      <div class="acts"><button class="btn primary" onclick="A.cbsSend('${c.id}')">${icon('bank', 14)} ${L0?.status === 'FAILED' ? 'Retry' : 'Send to core banking'}</button></div><div id="cbs-anim"></div></div>`;
  }
  return `<div class="grid2"><div class="card"><h3>Limit update instruction</h3>${kv([['Approved DP', cr(c.approval.dp || k.recommended)], ['Sanction', cr(c.sanction)], ['Current operative limit', cr(c.operative)], ['New operative limit', `<b>${cr(k.recommended)}</b>`], ['Effective date', eff], ['Account', c.bor.acct], ['Approved by', esc(c.approval.by) + ' · ' + fmtDT(c.approval.ts)]])}</div>
    <div class="card">${L0?.status === 'SUCCESS' ? `<div class="cbs-ok">${icon('checkc', 28)}<h3>Limit updated</h3>${kv([['Core banking reference', L0.ref], ['Limit updated', cr(k.recommended)], ['Date / time', fmtDT(L0.ts)]])}</div>` : `<h3>Core banking status</h3><p>${badge(L0?.status || 'Limit Update Pending')}</p>`}
      ${L0?.attempts?.length ? `<h4>Attempts</h4><ul class="plain">${L0.attempts.map(a => `<li>${fmtDT(a.ts)} · ${badge(a.status)} <span class="fine">${esc(a.msg)}</span></li>`).join('')}</ul>` : ''}</div></div>${act}`;
}

/* ---------- Timeline & audit ---------- */
function tTimeline(c){
  const ev = ST.audit.filter(a => a.caseId === c.id).sort((a, b) => a.ts - b.ts);
  const ms = ['Due', 'Received', 'Processed', 'Exception raised', 'Sent to RM', 'RM responded', 'Credit accepted', 'DP calculated', 'Approved', 'Limit updated', 'Closed'];
  const first = m => m === 'Due' ? { ts: c.dueDate, user: 'Per CAM ' + CLAUSE.submit } : ev.find(e => e.milestone === m);
  return `<div class="grid-tl"><div class="card"><h3>Case chronology</h3><ol class="chron">${ms.map(m => { const e = first(m); return `<li class="${e ? 'done' : ''}"><b>${m}</b>${e ? `<span class="fine muted">${fmtDT(e.ts)} · ${esc(e.user)}</span>` : '<span class="fine muted">—</span>'}</li>`; }).join('')}</ol></div>
    <div class="card flush"><div class="card-h"><h3>Audit trail</h3><span class="fine muted">${ev.length} events · append-only</span></div>${auditTable(ev.slice().reverse())}</div></div>`;
}
function auditTable(ev){
  return `<div class="tscroll"><table class="tbl audit"><thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Old value</th><th>New value</th><th>Reason</th><th>Reference</th></tr></thead><tbody>
  ${ev.map(e => `<tr><td class="num">${fmtDTs(e.ts)}</td><td>${esc(e.user)}</td><td>${esc(e.role)}</td><td>${esc(e.action)}</td><td class="num">${esc(e.old)}</td><td class="num">${esc(e.nw)}</td><td class="fine">${esc(e.reason)}</td><td class="fine">${esc(e.ref)}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">No events</td></tr>'}</tbody></table></div>`;
}

/* ---------- Reports ---------- */
const REPORTS = [['review', 'Stock statement review summary'], ['exc', 'Exception report'], ['dpsheet', 'DP calculation sheet'], ['note', 'Approval note'], ['limit', 'Limit update instruction'], ['trend', 'Borrower monthly trend'], ['portfolio', 'Portfolio exception report']];
function tReports(c){
  return `<div class="card"><h3>Generated reports</h3><p class="muted fine">Built from live case data. Use Print, then “Save as PDF”, to download.</p><div class="rep-grid">${REPORTS.map(([k2, l]) => `<div class="rep"><div>${icon('file', 20)}<b>${l}</b></div><div class="acts"><button class="btn sm" onclick="A.report('${c.id}','${k2}')">View</button><button class="btn sm ghost" onclick="A.report('${c.id}','${k2}',true)">${icon('print', 13)} Print / PDF</button></div></div>`).join('')}</div></div>`;
}
function reportHTML(c, kind){
  const k = CRE.calculateDP(c), b = c.bor, now = fmtDT(SIM_NOW);
  const head = t => `<div class="rp-h"><div><b>ValueMap Prism · Prism Monitor</b><span>${t}</span></div><div class="fine">Generated ${now} by ${esc(ROLES[ST.role].name)}</div></div><h2>${esc(b.name)}</h2><p class="fine">${c.id} · ${c.month} · ${c.cam.facility} · ${b.cust} · RM ${esc(b.rm)} · Status ${caseStatus(c)}</p>`;
  const tbl = (hd, rows) => `<table class="tbl"><thead><tr>${hd.map(h2 => `<th>${h2}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  switch (kind){
    case 'review': return head('Stock statement review summary') + kv([['Pages', c.pages.length], ['Extraction confidence', DocumentIntelligenceService.calculateConfidence(c) + '%'], ['Document checks', DocumentIntelligenceService.validations(c).map(x => x.label + ': ' + x.status).join(', ')], ['Exceptions', c.excs.length + ' raised, ' + openExcs(c).length + ' open'], ['Calculated DP', cr(k.calculatedDP)], ['Recommended operative limit', cr(k.recommended)]]) + tbl(['Parameter', 'CAM', 'Statement', 'Result'], compareRows(c).map(r => [r.p, esc(r.req), esc(r.st), r.res]));
    case 'exc': return head('Exception report') + tbl(['ID', 'Category', 'Severity', 'Exception', 'Customer', 'System', 'DP impact', 'Status'], c.excs.map(e => { const v = exView(c, e); return [e.id, e.cat, e.sev, esc(e.title), esc(v.cust), esc(v.sys), v.impact ? amt(v.impact) : '—', e.status]; }));
    case 'dpsheet': return head('DP calculation sheet') + tbl(['Line', 'Value', 'Source', 'Rule', 'Calculation'], dpSheetRows(c, k).map(r => [esc(r.l), (r.t === 'minus' ? '−' : '') + inr(r.v), esc(r.src || ''), esc(r.rule || ''), esc(r.calc || '')]));
    case 'note': return head('Approval note') + kv([['Existing limit', cr(c.operative)], ['Calculated DP', cr(k.calculatedDP)], ['Recommended limit', cr(k.recommended)], ['Change', cr(k.change)], ['Maker', esc(c.submission?.by || '—')], ['Recommendation', esc(c.submission?.rec || '—')], ['Checker decision', c.approval ? esc(c.approval.decision + ' by ' + c.approval.by + ' · ' + c.approval.comments) : 'Pending']]);
    case 'limit': return head('Limit update instruction') + kv([['Account', b.acct], ['Current operative limit', cr(c.operative)], ['New operative limit', cr(k.recommended)], ['Effective date', '30-Sep-2026'], ['Approval', c.approval ? esc(c.approval.by + ' · ' + fmtDT(c.approval.ts)) : 'Not yet approved'], ['Core banking', c.limit ? esc(c.limit.status + (c.limit.ref ? ' · ' + c.limit.ref : '')) : 'Not sent']]);
    case 'trend': return head('Borrower monthly trend') + tbl(['Month', 'Stock', 'Receivables', 'Creditors', 'DP', 'Operative'], histOf(c).map(h => [h.m, cr(h.stock), cr(h.rec), cr(h.cred), cr(h.dp), cr(h.op)]));
    case 'portfolio': return `<div class="rp-h"><div><b>ValueMap Prism · Prism Monitor</b><span>Portfolio exception report — Aug 2026</span></div><div class="fine">Generated ${now}</div></div>` + tbl(['Case', 'Borrower', 'Status', 'Open', 'Total', 'DP impact'], ST.cases.filter(x => x.received).map(x => [x.id, esc(x.bor.name), caseStatus(x), openExcs(x).length, x.excs.length, cr(CRE.calculateDP(x).change)]));
  }
  return '';
}
