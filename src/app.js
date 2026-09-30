'use strict';
const NAV = [
  ['overview', 'Executive overview', 'home'], ['work', 'My work', 'task'], ['queue', 'Stock statements', 'inbox'], ['borrowers', 'Borrowers', 'users'], ['exceptions', 'Exceptions', 'alert'],
  ['dp', 'Drawing power', 'calc'], ['approvals', 'Approvals', 'checkc'], ['limits', 'Limit updates', 'bank'], ['monitoring', 'Credit monitoring', 'pulse'], ['analytics', 'Portfolio analytics', 'chart'],
  ['documents', 'Documents', 'folder'], ['rules', 'Rules & configuration', 'sliders'], ['audit', 'Audit trail', 'shield'], ['admin', 'Administration', 'gear'],
];
const VIEWS = { overview: vOverview, work: vWork, queue: vQueue, borrowers: vBorrowers, borrower: vBorrower, exceptions: vExceptions, dp: vDP, approvals: vApprovals, limits: vLimits, monitoring: vMonitoring, analytics: vAnalytics, documents: vDocuments, rules: vRules, audit: vAudit, admin: vAdmin, case: caseView };
const DEMOS = [['Golden path — Apex Auto Components', 'SS-2026-000348'], ['Clean statement', 'SS-2026-000339'], ['Arithmetic error', 'SS-2026-000356'], ['Overdue debtors', 'SS-2026-000312'], ['Missing signature', 'SS-2026-000351'], ['Missing declaration', 'SS-2026-000327'], ['Creditor adjustment', 'SS-2026-000331'], ['CAM / DP methodology', 'SS-2026-000298'], ['DP reduction', 'SS-2026-000282'], ['Low OCR confidence', 'SS-2026-000362'], ['Revised statement', 'SS-2026-000344'], ['Statement not received', 'SS-2026-000371']];

function sidebar(){
  const pg = ST.route.page === 'case' ? 'queue' : ST.route.page === 'borrower' ? 'borrowers' : ST.route.page;
  const cnt = { work: workItems(ST.role).length, exceptions: ST.cases.reduce((s, c) => s + openExcs(c).length, 0), approvals: ST.cases.filter(c => caseStatus(c) === 'Awaiting Approval').length, limits: ST.cases.filter(c => ['Limit Update Pending', 'Limit Update Failed'].includes(caseStatus(c))).length };
  return `<div class="brand"><div class="prism" aria-hidden="true"></div><div><span class="b1">VALUEMAP PRISM</span><span class="b2">PRISM MONITOR</span></div></div>
    <div class="psw"><button onclick="A.psw()" aria-haspopup="true">${icon('layers', 14)} Prism Monitor ${icon('down', 12)}</button><div id="psw-m" class="psw-m" hidden>${['Prism Insight', 'Prism Simulate', 'Prism DealFlow', 'Prism Intelligence', 'Prism Monitor'].map(p => `<div class="${p === 'Prism Monitor' ? 'on' : ''}">${p}${p === 'Prism Monitor' ? icon('check', 13) : '<em>not in POC</em>'}</div>`).join('')}</div></div>
    <nav>${NAV.map(([k, l, i]) => `<a href="#" class="${pg === k ? 'on' : ''}" onclick="A.go({page:'${k}'});return false">${icon(i, 16)}<span>${l}</span>${cnt[k] ? `<em>${cnt[k]}</em>` : ''}</a>`).join('')}</nav>
    <div class="side-foot"><b>ValueMap Technologies</b><span>Prism Product Family</span><span class="fine">Intelligent Stock Statement Analysis, Credit Monitoring & Drawing Power Management</span></div>`;
}
function topbar(){
  const r = ROLES[ST.role], unread = ST.notifs.filter(n => !n.read).length, tasks = workItems(ST.role).length;
  const who = ST.role === 'rm' ? (ST.rmIdentity === 'All' ? r.name : ST.rmIdentity) : r.name;
  return `<button class="icon-btn menu" onclick="A.toggleNav()" aria-label="Menu">${icon('menu')}</button>
    <div class="gsearch">${icon('search', 15)}<input id="gs" placeholder="Search borrower, customer ID, account, case, exception, RM, branch" oninput="A.search(this.value)" onfocus="A.search(this.value)" autocomplete="off"><div id="gs-res" class="gs-res" hidden></div></div>
    <label class="tb-f">Reporting month<select aria-label="Reporting month"><option>Aug 2026</option><option disabled>Jul 2026 (closed)</option></select></label>
    <label class="tb-f demo">Demo scenario<select onchange="A.demo(this.value)"><option value="">Choose…</option>${DEMOS.map(([l, id]) => `<option value="${id}">${l}</option>`).join('')}<option value="reset">↺ Reset demo data</option></select></label>
    <span class="clock num" title="Simulated clock">${icon('clock', 13)} ${fmtDTs(SIM_NOW)}</span>
    <button class="icon-btn" onclick="A.theme()" aria-label="Toggle dark mode" title="Toggle theme">${icon('eye', 16)}</button>
    <button class="icon-btn bell" onclick="A.notifs()" aria-label="Alerts">${icon('bell')}${unread ? `<em>${unread}</em>` : ''}</button>
    <button class="icon-btn bell" onclick="A.go({page:'work'})" aria-label="Tasks" title="My tasks">${icon('task')}${tasks ? `<em>${tasks}</em>` : ''}</button>
    <label class="tb-f role">Acting as<select onchange="A.setRole(this.value)">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === ST.role ? 'selected' : ''}>${v.short}</option>`).join('')}</select></label>
    <div class="me" title="${esc(who)} · ${esc(r.title)}"><span class="av">${who.split(' ').map(x => x[0]).join('').slice(0, 2)}</span><span class="me-t"><b>${esc(who)}</b><em>${esc(r.short)}</em></span></div>
    <div id="notif-p" class="notif-p" hidden></div>`;
}
function render(){
  document.getElementById('side').innerHTML = sidebar();
  document.getElementById('top').innerHTML = topbar();
  const v = VIEWS[ST.route.page] || vOverview;
  document.getElementById('main').innerHTML = (ST.role === 'auditor' ? `<div class="ro-banner">${icon('shield', 14)} Auditor — read-only access. All actions are disabled; every screen and the full audit trail are visible.</div>` : '') + v();
}

function skeleton(){ return `<div class="skel"><div class="sk h1"></div><div class="sk row"></div><div class="sk-grid"><div class="sk box"></div><div class="sk box"></div><div class="sk box"></div></div><div class="sk tall"></div></div>`; }

const A = {
  go(route){
    const prev = ST.route; ST.route = { ...route }; ST.ui.hl = null;
    if (route.ex) ST.ui.ex = route.ex;
    if (route.page === 'case' && prev.id !== route.id){ ST.ui.page = 1; ST.ui.sim = null; ST.ui.dpExp = {}; if (!route.ex) ST.ui.ex = null;
      document.getElementById('main').innerHTML = skeleton(); document.getElementById('side').innerHTML = sidebar(); setTimeout(() => { render(); scrollTop(); }, 260); }
    else { render(); scrollTop(); }
    document.body.classList.remove('nav-open');
  },
  tab(t){ ST.route.tab = t; ST.route.sub = null; render(); const h = document.querySelector('.tabs'); h && h.scrollIntoView({ block: 'nearest' }); },
  sub(s){ ST.route.sub = s; render(); },
  page(n){ ST.ui.page = n; ST.ui.hl = null; render(); },
  hl(page, region){ ST.ui.page = page; ST.ui.hl = { page, region }; if (ST.route.tab !== 'docs'){ ST.route.tab = 'docs'; } render(); setTimeout(() => { const el = document.querySelector('.hl-on'); el && el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 40); },
  src(page, region){ ST.route.tab = 'docs'; A.hl(page, region); },
  setRole(r){ ST.role = r; const c = ST.route.page === 'case' ? CASE(ST.route.id) : null; if (r === 'rm' && c) ST.rmIdentity = c.bor.rm; render(); toast('Now acting as ' + ROLES[r].short + ' — ' + (r === 'rm' ? ST.rmIdentity : ROLES[r].name), 'info'); },
  rmId(v){ ST.rmIdentity = v; render(); },
  theme(){ const el = document.documentElement, cur = el.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); el.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark'); },
  toggleNav(){ document.body.classList.toggle('nav-open'); },
  psw(){ const m = document.getElementById('psw-m'); m.hidden = !m.hidden; },

  /* ----- search & notifications ----- */
  search(q){
    const box = document.getElementById('gs-res'); q = q.trim().toLowerCase(); if (!q){ box.hidden = true; return; }
    const res = [];
    BORROWERS.forEach(b => { if ((b.name + b.cust + b.acct + b.branch + b.rm + 'cash credit').toLowerCase().includes(q)) res.push({ t: b.name, s: b.cust + ' · ' + b.acct + ' · ' + b.branch + ' · RM ' + b.rm, k: 'Borrower', go: `{page:'borrower',id:'${b.id}'}` }); });
    ST.cases.forEach(c => { if (c.id.toLowerCase().includes(q)) res.push({ t: c.id, s: c.bor.name + ' · ' + caseStatus(c), k: 'Case', go: `{page:'case',id:'${c.id}'}` });
      c.excs.forEach(e => { if (e.id.toLowerCase().includes(q)) res.push({ t: e.id, s: e.title + ' · ' + c.bor.short, k: 'Exception', go: `{page:'case',id:'${c.id}',tab:'exceptions',ex:'${e.id}'}` }); }); });
    box.innerHTML = res.length ? res.slice(0, 9).map(r => `<button onclick="document.getElementById('gs').value='';A.go(${r.go})"><span class="tag">${r.k}</span><b>${esc(r.t)}</b><span class="fine muted">${esc(r.s)}</span></button>`).join('') : '<div class="muted fine pad">No matches</div>';
    box.hidden = false;
  },
  notifs(){
    const p = document.getElementById('notif-p'); if (!p.hidden){ p.hidden = true; return; }
    p.innerHTML = `<div class="np-h"><b>Alerts</b><button class="btn sm ghost" onclick="A.readAll()">Mark all read</button></div>` + ST.notifs.slice(0, 12).map(n => `<button class="np-i ${n.read ? '' : 'unread'} k-${n.kind}" onclick="A.openNotif('${n.id}')"><span>${esc(n.text)}</span><em>${fmtDTs(n.ts)}</em></button>`).join('');
    p.hidden = false;
  },
  openNotif(id){ const n = ST.notifs.find(x => x.id === id); n.read = true; if (n.route) A.go(n.route); else render(); },
  readAll(){ ST.notifs.forEach(n => n.read = true); render(); },
  demo(v){ if (!v) return; if (v === 'reset'){ openModal(mHead('Reset demo data?', 'All cases return to their seeded state. Audit history from this session is cleared.') + `<div class="m-f"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="initState();closeModal();A.go({page:'overview'});toast('Demo data reset')">Reset demo</button></div>`); render(); return; } A.go({ page: 'case', id: v }); },

  /* ----- queue & filters ----- */
  qf(k, v, partial){ ST.ui.qf[k] = v; if (partial){ document.getElementById('q-body').innerHTML = queueBody(); return; } render(); },
  qSort(k){ const f = ST.ui.qf; f.dir = f.sort === k ? -(f.dir || -1) : -1; f.sort = k; render(); },
  qReset(){ ST.ui.qf = {}; render(); },
  ef(k, v){ ST.ui.ef[k] = v; render(); }, af(k, v){ ST.ui.af[k] = v; render(); },
  drill(x){ if (x === -1) ST.ui.drill = []; else if (typeof x === 'number') ST.ui.drill = ST.ui.drill.slice(0, x + 1); else ST.ui.drill.push(x); render(); },

  /* ----- HITL fields ----- */
  acceptField(cid, key){ const c = CASE(cid), f = c.fields.find(x => x.key === key), prev = caseStatus(c);
    f.reviewed = true; f.validated = f.extracted; f.by = ROLES.analyst.name; f.at = tick();
    log(c, 'Accepted extracted ' + f.name.toLowerCase(), { nw: f.type === 'amt' ? inr(f.extracted) : f.extracted, reason: 'Verified against source page ' + f.page + ' (confidence ' + f.conf + '%)' });
    syncExceptions(c); after(c, prev); toast(f.name + ' accepted'); render(); },
  editField(cid, key){ const c = CASE(cid), f = c.fields.find(x => x.key === key);
    openModal(mHead('Correct extracted value', esc(f.name) + ' · page ' + f.page + ' · confidence ' + f.conf + '%') + `<div class="m-b">${kv([['Original value', f.type === 'amt' ? inr(f.extracted) : esc(f.extracted)], ['Changed by', ROLES.analyst.name], ['Date / time', fmtDT(SIM_NOW)]])}
      <label class="lbl">Revised value${f.type === 'amt' ? ' (₹)' : ''}</label><input id="fv" value="${f.type === 'amt' ? (f.truth ?? f.extracted).toLocaleString('en-IN') : esc(f.extracted)}">
      <label class="lbl">Reason (mandatory)</label><textarea id="fr" rows="2">OCR misread; verified against printed total on page ${f.page}</textarea>
      <button class="btn sm ghost" onclick="closeModal();A.src(${f.page},'${f.region}')">${icon('eye', 13)} View source</button></div>
      <div class="m-f"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="A.saveField('${cid}','${key}')">Save correction</button></div>`); },
  saveField(cid, key){ const c = CASE(cid), f = c.fields.find(x => x.key === key), prev = caseStatus(c);
    const raw = document.getElementById('fv').value, reason = document.getElementById('fr').value.trim();
    if (!reason) return toast('Enter a reason for the correction', 'err');
    const v = f.type === 'amt' ? Math.round(parseFloat(raw.replace(/[₹,\s]/g, ''))) : raw; if (f.type === 'amt' && !Number.isFinite(v)) return toast('Enter a valid amount', 'err');
    f.reviewed = true; f.validated = v; f.by = ROLES.analyst.name; f.at = tick(); f.reason = reason;
    log(c, 'Changed extracted ' + f.name.toLowerCase(), { old: f.type === 'amt' ? cr(f.extracted) : f.extracted, nw: f.type === 'amt' ? cr(v) : v, reason, ref: f.id });
    syncExceptions(c); after(c, prev); closeModal(); toast('Correction saved and logged to audit trail'); render(); },

  /* ----- exceptions ----- */
  selEx(id){ ST.ui.ex = id; render(); },
  openEx(id){ ST.ui.ex = id; A.tab('exceptions'); },
  sendRM(id, silent){ const { c, e } = findEx(id), prev = caseStatus(c);
    e.status = 'Sent to RM'; e.sentAt = tick(); e.dueAt = e.sentAt + ST.cfg.sla.rmResponse * HR; e.trail.push({ s: 'Sent to RM', ts: e.sentAt, by: ROLES.analyst.name });
    log(c, 'Exception sent to RM', { ref: e.id, nw: c.bor.rm + ' · due ' + fmtDT(e.dueAt), ms: 'Sent to RM' });
    notify('New discrepancy from credit for ' + c.bor.name + ' (' + e.id + ').', { page: 'case', id: c.id, tab: 'exceptions', ex: e.id });
    if (!silent){ after(c, prev); toast(e.id + ' sent to ' + c.bor.rm + ' · response due in ' + ST.cfg.sla.rmResponse + 'h'); render(); } },
  sendAllRM(cid){ const c = CASE(cid), prev = caseStatus(c), list = c.excs.filter(e => e.status === 'Open' && e.rmReq); list.forEach(e => A.sendRM(e.id, true)); after(c, prev); toast(list.length + ' exception(s) sent to ' + c.bor.rm); render(); },
  acceptSys(id){ const { c, e } = findEx(id), prev = caseStatus(c);
    e.status = 'Resolved'; e.decision = { type: e.key === 'DP_BELOW_OS' ? 'Acknowledged — flagged for regularisation' : 'System treatment accepted', by: ROLES.analyst.name, ts: tick(), reason: exView(c, e).treat };
    e.trail.push({ s: 'Credit Review', ts: SIM_NOW, by: ROLES.analyst.name }, { s: 'Resolved', ts: SIM_NOW, by: ROLES.analyst.name });
    log(c, e.decision.type, { ref: e.id, reason: e.decision.reason });
    after(c, prev); toast(e.id + ' resolved'); render(); },
  override(id){ const { c, e } = findEx(id), v = exView(c, e);
    openModal(mHead('Override system treatment', e.id + ' · ' + esc(e.title)) + `<div class="m-b"><div class="warnline">${icon('alert', 14)} Overrides change drawing power, are restricted to credit analysts and are highlighted to the checker.</div>${kv([['System treatment', esc(v.sys)], ['DP impact of override', v.impact ? '+' + amt(v.impact) : '—'], ['CAM clause', v.clause]])}
      <label class="lbl">Justification (mandatory)</label><textarea id="ov-r" rows="3" placeholder="Reference the approval or evidence that permits deviation from CAM"></textarea></div>
      <div class="m-f"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="A.doOverride('${id}')">Override</button></div>`); },
  doOverride(id){ const { c, e } = findEx(id), r = document.getElementById('ov-r').value.trim(); if (r.length < 10) return toast('Justification is mandatory for an override', 'err');
    const prev = caseStatus(c), before = CRE.calculateDP(c).recommended;
    c.ovr[{ GIT: 'GIT', OVERAGED: 'OVERAGED', RELATED: 'RELATED', CRED_SHORT: 'CRED' }[e.key]] = true;
    e.status = 'Resolved'; e.decision = { type: 'Overridden', by: ROLES.analyst.name, ts: tick(), reason: r }; e.trail.push({ s: 'Resolved', ts: SIM_NOW, by: ROLES.analyst.name });
    log(c, 'Override of system treatment', { ref: e.id, old: cr(before), nw: cr(CRE.calculateDP(c).recommended), reason: r });
    syncExceptions(c); after(c, prev); closeModal(); toast('Override recorded — checker comments now mandatory', 'info'); render(); },
  comment(id){ openModal(mHead('Add comment', id) + `<div class="m-b"><textarea id="cm" rows="3" placeholder="Comment visible to credit, RM and checker"></textarea></div><div class="m-f"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="A.saveComment('${id}')">Add comment</button></div>`); },
  saveComment(id){ const { c, e } = findEx(id), t = document.getElementById('cm').value.trim(); if (!t) return toast('Comment is empty', 'err');
    const by = ST.role === 'rm' ? c.bor.rm : ROLES[ST.role].name; e.comments.push({ by, ts: tick(), text: t }); log(c, 'Comment added', { ref: e.id, reason: t }); closeModal(); render(); },

  /* ----- RM ----- */
  rmAttach(id){ const { c, e } = findEx(id); keepDraft(e); const seed = c.rmSeed[e.key]; e._draftFiles = e._draftFiles || [];
    const pool = seed?.files?.length ? seed.files : [c.bor.short.replace(/\s/g, '_') + '_evidence_' + (e._draftFiles.length + 1) + '.pdf'];
    const next = pool.find(f => !e._draftFiles.includes(f)) || c.bor.short.replace(/\s/g, '_') + '_evidence_' + (e._draftFiles.length + 1) + '.pdf';
    e._draftFiles.push(next); if (!e.trail.some(t => t.s === 'RM Viewed')) e.trail.push({ s: 'RM Viewed', ts: tick(1), by: c.bor.rm }); toast('Attached ' + next, 'info'); render(); },
  rmSubmit(id){ const { c, e } = findEx(id), text = document.getElementById('rm-text').value.trim(); if (!text) return toast('Enter a clarification for credit', 'err');
    const prev = caseStatus(c), ce = document.getElementById('rm-claim'), claim = ce && ce.value ? L(parseFloat(ce.value)) : null;
    if (!e.trail.some(t => t.s === 'RM Viewed')) e.trail.push({ s: 'RM Viewed', ts: tick(1), by: c.bor.rm });
    e.rm = { text, files: e._draftFiles || [], claim, by: c.bor.rm, ts: tick(4) }; e.status = 'RM Responded'; e.trail.push({ s: 'RM Responded', ts: e.rm.ts, by: c.bor.rm }); delete e._draftText;
    log(c, 'RM responded to exception', { ref: e.id, nw: (e.rm.files.join(', ') || 'comment only') + (claim ? ' · claims ' + lk(claim) : ''), reason: text.slice(0, 120), ms: 'RM responded' });
    notify('RM response received for ' + c.bor.name + '.', { page: 'case', id: c.id, tab: 'exceptions', ex: e.id });
    after(c, prev); toast('Response sent to credit'); render(); },
  rmExtend(id){ const { c, e } = findEx(id); keepDraft(e); e.dueAt += 24 * HR; log(c, 'RM requested SLA extension (24h)', { ref: e.id, nw: 'Due ' + fmtDT(e.dueAt) }); toast('Extension recorded · new due ' + fmtDT(e.dueAt), 'info'); render(); },

  /* ----- credit decision on RM response ----- */
  decType(v){ const p = document.getElementById('partial'); if (p) p.style.display = v === 'Partially accept' ? '' : 'none'; },
  decide(id){ const { c, e } = findEx(id), type = document.querySelector('input[name=dec]:checked').value, reason = document.getElementById('d-reason').value.trim();
    if (type !== 'Accept' && !reason) return toast('A reason is mandatory for this decision', 'err');
    const prev = caseStatus(c), before = CRE.calculateDP(c).recommended, by = ROLES.analyst.name;
    if (type === 'Seek clarification'){ e.status = 'Sent to RM'; e.sentAt = tick(); e.dueAt = e.sentAt + ST.cfg.sla.rmResponse * HR; e.comments.push({ by, ts: SIM_NOW, text: 'Clarification sought: ' + reason }); e.prevRm = e.rm; e.rm = null; e.trail.push({ s: 'Sent to RM', ts: SIM_NOW, by });
      log(c, 'Further clarification sought from RM', { ref: e.id, reason }); after(c, prev); toast('Sent back to ' + c.bor.rm, 'info'); return render(); }
    let accepted = null;
    if (type === 'Partially accept'){ accepted = L(parseFloat(document.getElementById('d-acc').value)); if (!Number.isFinite(accepted) || accepted <= 0 || accepted > (e.rm.claim || Infinity)) return toast('Accepted amount must be between zero and the claim', 'err'); }
    if (type === 'Accept' || type === 'Partially accept'){
      if (e.key === 'OVERAGED') reclassifyDisputed(c, type === 'Accept' ? (e.rm.claim || sum(c.debtors.filter(d => d.disputedAge != null).map(d => d.amt))) : accepted);
      if (e.key === 'SIGNATURE') c.pages.filter(p => p.sigReq && !p.signed).forEach(p => p.signed = true);
      if (e.key === 'STAMP') c.pages.filter(p => p.stampReq && !p.stamped).forEach(p => p.stamped = true);
      if (e.key === 'DECLARATION'){ c.pages.push({ n: c.pages.length + 1, type: 'Declaration', conf: 95, sigReq: true, signed: true, stampReq: true, stamped: true, skew: 0 }); c.fields.push({ key: 'declaration', name: 'Declaration clause', page: c.pages.length, region: 'declaration', type: 'text', extracted: 'Present – signed (received via RM)', conf: 95, reviewed: true, validated: 'Present – signed (received via RM)', by, id: c.id + '-declaration' }); }
    }
    e.status = 'Resolved'; e.decision = { type: type === 'Accept' ? 'RM clarification accepted' : type === 'Partially accept' ? 'Partially accepted' : 'RM clarification rejected', by, ts: tick(), reason: reason || 'Evidence verified', claim: e.rm.claim, accepted };
    e.trail.push({ s: 'Credit Review', ts: SIM_NOW, by }, { s: 'Resolved', ts: SIM_NOW, by });
    const afterDP = CRE.calculateDP(c).recommended;
    log(c, e.decision.type, { ref: e.id, old: cr(before), nw: cr(afterDP) + (accepted ? ' (accepted ' + lk(accepted) + ' of ' + lk(e.rm.claim) + ')' : ''), reason: reason, ms: type === 'Reject' ? null : 'Credit accepted' });
    syncExceptions(c); after(c, prev);
    toast(e.decision.type + (afterDP !== before ? ' · DP ' + cr(before) + ' → ' + cr(afterDP) : '')); render(); },

  /* ----- DP ----- */
  toggleSim(){ const c = CASE(ST.route.id); ST.ui.sim = ST.ui.sim ? null : { stockAdj: 0, realise: 0, sm: c.cam.stockMargin, rm: c.cam.recMargin, cp: 100 }; render(); },
  simSet(id, v){ ST.ui.sim[id] = +v; const c = CASE(ST.route.id), tmp = document.createElement('div'); tmp.innerHTML = simPanel(c);
    document.querySelector('.sim-out').innerHTML = tmp.querySelector('.sim-out').innerHTML; document.getElementById('sv-' + id).textContent = tmp.querySelector('#sv-' + id).textContent; },
  simReset(){ ST.ui.sim = null; A.toggleSim(); },
  dpExp(id){ ST.ui.dpExp = ST.ui.dpExp || {}; ST.ui.dpExp[id] = !ST.ui.dpExp[id]; render(); },
  submitDP(cid){ const c = CASE(cid), rec = document.getElementById('rec').value.trim(); if (!rec) return toast('Add a recommendation', 'err');
    const k = CRE.calculateDP(c); c.submission = { by: ROLES.analyst.name, ts: tick(), rec, dp: k.recommended, calc: k.calculatedDP }; c.returned = false;
    log(c, 'DP calculated and submitted for approval', { old: cr(c.operative), nw: cr(k.recommended), reason: rec.slice(0, 140), ms: 'DP calculated' });
    notify('DP approval required for ' + c.bor.name + '.', { page: 'case', id: c.id, tab: 'approval' });
    toast('Submitted to ' + approvalLevel(Math.abs(k.change)).who); ST.route.tab = 'approval'; render(); },

  /* ----- approval ----- */
  approve(cid, decision){ const c = CASE(cid), cm = document.getElementById('ap-c').value.trim(), ovr = c.excs.some(e => e.decision?.type === 'Overridden');
    if ((decision !== 'Approved' || ovr) && cm.length < 5) return toast('Comments are mandatory for ' + (decision === 'Approved' ? 'approving a case with overrides' : decision.toLowerCase()), 'err');
    const k = CRE.calculateDP(c), lvl = approvalLevel(Math.abs(k.change)).level, rec = { decision, by: ROLES.checker.name, ts: tick(), comments: cm, level: lvl, dp: k.recommended };
    if (decision === 'Approved'){ c.approval = rec; log(c, 'DP approved (checker)', { old: cr(c.operative), nw: cr(k.recommended), reason: cm, ms: 'Approved' });
      notify('Limit update pending for ' + c.bor.name + ' — ' + cr(k.recommended) + '.', { page: 'case', id: c.id, tab: 'limit' }); toast('Approved · instruction sent to operations'); }
    else { c.approvals = c.approvals || []; c.approvals.push(rec); c.returned = true; log(c, 'Checker decision: ' + decision, { reason: cm }); notify(decision + ' by checker for ' + c.bor.name + '.', { page: 'case', id: c.id, tab: 'dp' }); toast(decision + ' — case returned to credit analyst', 'info'); }
    render(); },

  /* ----- core banking ----- */
  cbsSend(cid){ const c = CASE(cid), out = document.getElementById('cbs-sim').value, box = document.getElementById('cbs-anim');
    const steps = ['Validating instruction against approval', 'Connecting to core banking gateway', 'Posting limit maintenance to ' + c.bor.acct, 'Awaiting acknowledgement'];
    box.innerHTML = `<ol class="proc">${steps.map((s, i) => `<li id="cb-${i}">${s}</li>`).join('')}</ol>`; document.querySelectorAll('.sub-card button').forEach(b => b.disabled = true);
    steps.forEach((_, i) => setTimeout(() => { const li = document.getElementById('cb-' + i); if (li){ li.className = 'run'; } if (i) document.getElementById('cb-' + (i - 1)).className = 'ok'; }, i * 480));
    setTimeout(() => A.cbsResult(cid, out), steps.length * 480 + 200); },
  cbsResult(cid, out){ const c = CASE(cid), k = CRE.calculateDP(c); c.limit = c.limit || { attempts: [] }; c.limit.attempts = c.limit.attempts || []; const t = tick(1);
    if (out === 'SUCCESS'){ const ref = c.id === 'SS-2026-000348' ? 'CBS-UL-893847' : 'CBS-UL-' + (893000 + parseInt(c.id.slice(-3))); Object.assign(c.limit, { status: 'SUCCESS', ref, ts: t }); c.limit.attempts.push({ ts: t, status: 'SUCCESS', msg: 'Limit updated · ' + ref });
      log(c, 'Operative limit updated in core banking', { old: cr(c.operative), nw: cr(k.recommended), ref, ms: 'Limit updated' }); log(c, 'Case closed', { user: 'System', role: 'System', ms: 'Closed', min: 1 });
      notify('Limit updated for ' + c.bor.name + ' · ' + ref + '.', { page: 'case', id: c.id, tab: 'limit' }); toast('Limit updated · ' + ref); }
    else if (out === 'PENDING'){ Object.assign(c.limit, { status: 'PENDING', ref: 'CBS-Q-' + (554000 + parseInt(c.id.slice(-3))), ts: t }); c.limit.attempts.push({ ts: t, status: 'PENDING', msg: 'Queued for batch posting' }); log(c, 'Limit update queued in core banking', { nw: 'PENDING' }); toast('Core banking accepted the instruction — pending', 'info'); }
    else if (out === 'FAILED'){ c.limit.status = 'FAILED'; c.limit.attempts.push({ ts: t, status: 'FAILED', msg: 'CBS-ERR-5031: Gateway timeout after 30s' }); log(c, 'Limit update sent to core banking — FAILED', { nw: 'CBS-ERR-5031', reason: 'Gateway timeout' }); notify('Limit update failed for case ' + c.id + '.', { page: 'case', id: c.id, tab: 'limit' }, 'crit'); toast('Core banking returned an error — retry or process manually', 'err'); }
    else { c.limit.status = 'MANUAL'; c.limit.attempts.push({ ts: t, status: 'MANUAL', msg: 'Account under lien marking — manual limit maintenance required' }); log(c, 'Core banking requires manual processing', { nw: 'MANUAL' }); toast('Manual processing required', 'info'); }
    render(); },
  cbsCheck(cid){ A.cbsResult(cid, 'SUCCESS'); },
  cbsManual(cid){ const c = CASE(cid), ref = document.getElementById('man-ref').value.trim(); if (!ref) return toast('Enter the core banking reference', 'err'); const k = CRE.calculateDP(c), t = tick();
    Object.assign(c.limit, { status: 'SUCCESS', ref, ts: t }); c.limit.attempts.push({ ts: t, status: 'SUCCESS', msg: 'Processed manually · ' + ref }); log(c, 'Limit updated manually in core banking', { old: cr(c.operative), nw: cr(k.recommended), ref, ms: 'Limit updated' }); log(c, 'Case closed', { user: 'System', role: 'System', ms: 'Closed', min: 1 }); toast('Limit updated · ' + ref); render(); },

  /* ----- explainability ----- */
  why(key){
    const [kind, cid] = key.split(':'), c = CASE(cid), k = CRE.calculateDP(c), m = c.cam, pgD = c.fields.find(f => f.key === 'debtorTotal').page;
    const pts = [], title = { limit: 'Why ' + (k.change < 0 ? 'was the limit reduced?' : 'did the limit change?'), aged: 'Why was ' + lk(k.overaged) + ' excluded?', related: 'Why was ' + lk(k.related) + ' excluded?', git: 'Why is goods in transit ineligible?', cred: 'Why are more creditors deducted?', arith: 'Why is the stock total different?' }[kind];
    if (kind === 'limit'){ pts.push('Calculated DP is ' + cr(k.calculatedDP) + ' = stock DP ' + cr(k.stockDP) + ' + receivable DP ' + cr(k.recDP) + '.', 'Recommended operative limit = MIN(' + cr(k.calculatedDP) + ', sanction ' + cr(k.sanction) + ') = ' + cr(k.recommended) + ' (rule DP-CAP-001, ' + CLAUSE.cap + ').', 'Existing operative limit is ' + cr(k.existing) + ', so the change is ' + cr(k.change) + '.');
      c.excs.filter(e => ['GIT', 'OVERAGED', 'RELATED', 'CRED_SHORT', 'ARITH_STOCK', 'MARGIN'].includes(e.key)).forEach(e => { const v = exView(c, e); if (v.impact) pts.push(e.title + ': ' + amt(v.impact) + ' lower DP (' + v.rule + ').'); }); }
    if (kind === 'aged'){ pts.push('Receivables aged more than ' + m.recAge + ' days are not eligible.', 'CAM rule DP-REC-001 · ' + CLAUSE.age + '.', 'Source: Debtor Ageing Schedule, page ' + (pgD - 1 || pgD) + '; totals on page ' + pgD + '.'); k.debts.filter(d => !d.elig && !d.related).forEach(d => pts.push(d.name + ' ' + d.inv + ' — ' + d.effAge + ' days — ' + lk(d.amt)));
      const re = c.debtors.filter(d => d.acceptedAge != null); re.forEach(d => pts.push('Re-aged and now eligible: ' + d.inv + ' (' + lk(d.amt) + ') on GRN evidence accepted by credit.')); }
    if (kind === 'related') pts.push('Receivables from group concerns are excluded.', 'CAM rule DP-REC-002 · ' + CLAUSE.related + '.', ...k.debts.filter(d => d.related).map(d => d.name + ' ' + d.inv + ' — ' + lk(d.amt) + ' (disclosed in declaration)'));
    if (kind === 'git') pts.push('Goods in transit are not in the borrower\'s possession and cannot be inspected.', 'CAM rule DP-STK-002 · ' + CLAUSE.git + '.', 'Excluded: ' + lk(sum(k.rows.filter(r => r.cat === 'Goods in Transit').map(r => r.recalc))) + ' from Stock Summary page 1.');
    if (kind === 'cred'){ pts.push('Unpaid creditors for stock are deducted from eligible stock before margin (rule DP-CRD-001, ' + CLAUSE.cred + ').', 'Borrower deducted ' + cr(c.custDed) + '; system deducts ' + cr(k.creditors) + '.'); c.creditors.filter(x => x.stock && !x.custDed).forEach(x => pts.push('Not deducted by borrower: ' + x.name + ' ' + lk(x.amt))); }
    if (kind === 'arith'){ CRE.arithmeticChecks(c).filter(a => a.status === 'MISMATCH').forEach(a => pts.push(a.desc + ': reported ' + inr(a.reported) + ', recalculated ' + inr(a.system) + ' (' + inr(a.diff) + ').')); pts.push('DP always uses system-recalculated line items (rule VAL-ARI-001).'); }
    openModal(mHead(title, esc(c.bor.name) + ' · ' + c.id) + `<div class="m-b"><ol class="why-l">${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div><div class="m-f"><button class="btn" onclick="closeModal();A.lineage('${cid}','${kind === 'git' || kind === 'arith' ? 'stock' : kind === 'cred' ? 'cred' : kind === 'limit' ? 'final' : 'rec'}')">${icon('layers', 13)} View lineage</button><button class="btn primary" onclick="closeModal()">Close</button></div>`);
  },
  lineage(cid, metric = 'rec'){
    const c = CASE(cid), k = CRE.calculateDP(c), ar = CRE.arithmeticChecks(c), fd = c.fields.find(f => f.key === 'debtorTotal'), fs = c.fields.find(f => f.key === 'stockTotal');
    const apr = c.approval ? 'Approved ' + cr(c.approval.dp || k.recommended) + ' by ' + c.approval.by + ' · ' + fmtDTs(c.approval.ts) + (c.limit?.status === 'SUCCESS' ? ' · CBS ' + c.limit.ref : '') : c.submission && !c.returned ? 'Submitted ' + cr(c.submission.dp) + ' — awaiting checker' : 'Not yet approved — current ' + cr(k.recommended);
    const exRef = key => { const e = c.excs.find(x => x.key === key); return e ? e.id + ' (' + (e.decision?.type || e.status) + ')' : 'no exception'; };
    const reaged = c.debtors.filter(d => d.acceptedAge != null);
    const M = {
      rec: [['Source document', 'Debtor ageing schedule and summary, page ' + fd.page, [fd.page, 'total']], ['Extracted value', 'Total book debts ' + inr(fd.extracted) + ' · OCR ' + fd.conf + '%'], ['Validation', fd.reviewed ? (fd.validated !== fd.extracted ? 'Corrected to ' + inr(fd.validated) + ' by ' + fd.by + ' — ' + (fd.reason || '') : 'Accepted by ' + fd.by) : fieldPending(fd) ? 'Pending human validation' : 'Auto-accepted (≥' + ST.cfg.reviewThreshold + '%)'],
        ['Adjustment', '−' + lk(k.overaged) + ' aged > ' + c.cam.recAge + 'd; −' + lk(k.related) + ' related party' + (reaged.length ? '; ' + lk(sum(reaged.map(d => d.amt))) + ' re-aged on RM evidence ' + exRef('OVERAGED') : '')], ['CAM rule', 'DP-REC-001 (' + CLAUSE.age + '), DP-REC-002 (' + CLAUSE.related + '), margin ' + k.recMarginPct + '% (' + CLAUSE.margin + ')'], ['DP formula', 'Eligible ' + cr(k.eligibleRec) + ' × (1 − ' + k.recMarginPct + '%) = ' + cr(k.recDP)], ['Approved DP', apr]],
      stock: [['Source document', 'Stock summary page 1, inventory details page 2', [1, 'total']], ['Extracted value', 'Total stock ' + inr(fs.extracted) + ' · OCR ' + fs.conf + '%'], ['Validation', 'Recalculated from schedules: ' + inr(k.grossStock) + (ar.find(a => a.id === 'AR-STK-TOT').status === 'MISMATCH' ? ' — mismatch ' + exRef('ARITH_STOCK') : ' — reconciles')],
        ['Adjustment', '−' + lk(k.ineligibleStock) + ' ineligible stock; −' + cr(k.creditors) + ' unpaid creditors'], ['CAM rule', 'DP-STK-001/002 (' + CLAUSE.elig + ', ' + CLAUSE.git + '), DP-CRD-001, margin ' + k.stockMarginPct + '%'], ['DP formula', '(' + cr(k.eligibleStock) + ' − ' + cr(k.creditors) + ') × (1 − ' + k.stockMarginPct + '%) = ' + cr(k.stockDP)], ['Approved DP', apr]],
      cred: [['Source document', 'Creditor details, page ' + c.fields.find(f => f.key === 'credTotal').page, [c.fields.find(f => f.key === 'credTotal').page, 'table']], ['Extracted value', c.creditors.length + ' creditors, total ' + inr(sum(c.creditors.map(x => x.amt)))], ['Validation', 'Schedule total reconciles; stock-related flag classified per line'], ['Adjustment', 'Borrower deducted ' + cr(c.custDed) + '; system deducts ' + cr(k.creditors) + ' — ' + exRef('CRED_SHORT')], ['CAM rule', 'DP-CRD-001 · ' + CLAUSE.cred], ['DP formula', 'Net stock = ' + cr(k.eligibleStock) + ' − ' + cr(k.creditors) + ' = ' + cr(k.netStock)], ['Approved DP', apr]],
      final: [['Source document', c.pages.length + ' page groups · v' + c.version], ['Extracted value', 'Stock, debtors, creditors, outstanding'], ['Validation', pendingFields(c).length ? pendingFields(c).length + ' field(s) pending' : 'All fields validated; arithmetic recalculated'], ['Adjustment', c.excs.filter(e => e.status === 'Resolved').length + ' exceptions resolved, ' + c.excs.filter(e => e.decision?.type === 'Overridden').length + ' overrides'], ['CAM rule', 'DP-FRM-001 and DP-CAP-001 (' + CLAUSE.cap + ')'], ['DP formula', cr(k.stockDP) + ' + ' + cr(k.recDP) + ' = ' + cr(k.calculatedDP) + ' → MIN with ' + cr(k.sanction) + ' = ' + cr(k.recommended)], ['Approved DP', apr]],
    };
    const tabs = [['rec', 'Receivable DP'], ['stock', 'Stock DP'], ['cred', 'Creditors'], ['final', 'Final DP']];
    openModal(mHead('Calculation lineage', esc(c.bor.name) + ' · ' + c.id) + `<div class="m-b"><nav class="subtabs">${tabs.map(([t, l]) => `<button class="${t === metric ? 'on' : ''}" onclick="A.lineage('${cid}','${t}')">${l}</button>`).join('')}</nav>
      <ol class="lineage">${M[metric].map(([h, b, src]) => `<li><span>${h}</span><p>${esc(b)}</p>${src ? `<a href="#" onclick="closeModal();A.src(${src[0]},'${src[1]}');return false">${icon('eye', 12)} View source</a>` : ''}</li>`).join('')}</ol>
      <p class="fine muted">AI extraction feeds structured data only. Human validation, the deterministic rule engine and maker-checker determine the final number.</p></div>`, { wide: true });
  },

  /* ----- reports ----- */
  report(cid, kind, print){ const c = CASE(cid), html = `<div class="report">${reportHTML(c, kind)}<p class="fine muted rp-f">ValueMap Technologies · Prism Product Family · System-generated report</p></div>`;
    log(c, 'Report generated: ' + REPORTS.find(r => r[0] === kind)[1], { min: 0 });
    if (print){ document.getElementById('print-root').innerHTML = html; window.print(); return; }
    openModal(mHead(REPORTS.find(r => r[0] === kind)[1], esc(c.bor.name)) + `<div class="m-b">${html}</div><div class="m-f"><button class="btn" onclick="closeModal()">Close</button><button class="btn primary" onclick="A.report('${cid}','${kind}',true)">${icon('print', 13)} Print / save as PDF</button></div>`, { wide: true }); },

  /* ----- rules ----- */
  ruleEdit(id){ const r = ST.rules.find(x => x.id === id) || { id: 'DP-NEW-' + String(ST.rules.length + 1).padStart(3, '0'), name: '', cat: 'Margins', value: '', scope: 'Segment: SME', eff: '01-Oct-2026', status: 'Draft', clause: '—', ver: 0 };
    openModal(mHead(id ? 'Edit rule ' + id : 'New rule', 'Saved as a new version; takes effect from the effective date') + `<div class="m-b form2">
      <div><label class="lbl">Rule ID</label><input id="r-id" value="${r.id}" ${id ? 'readonly' : ''}></div><div><label class="lbl">Category</label><select id="r-cat">${['Margins', 'Ageing', 'Stock eligibility', 'Debtor eligibility', 'Creditors', 'Tolerances', 'DP formula', 'SLA', 'Approval authority', 'Document'].map(x => `<option ${x === r.cat ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="full"><label class="lbl">Rule</label><input id="r-name" value="${esc(r.name)}"></div><div><label class="lbl">Value</label><input id="r-val" value="${esc(r.value)}"></div><div><label class="lbl">Scope</label><select id="r-scope">${['Borrower', 'Product: Cash Credit', 'Segment: SME', 'Segment: Mid Corporate', 'Segment: SME & Mid Corporate', 'All'].map(x => `<option ${x === r.scope ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div><label class="lbl">Effective from</label><input id="r-eff" value="${r.eff}"></div><div><label class="lbl">Status</label><select id="r-st">${['Active', 'Draft', 'Inactive'].map(x => `<option ${x === r.status ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
      <div class="m-f"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="A.saveRule('${id || ''}')">Save rule</button></div>`); },
  saveRule(id){ const g = x => document.getElementById(x).value.trim(), name = g('r-name'); if (!name) return toast('Rule name is required', 'err');
    let r = ST.rules.find(x => x.id === id), old = r ? r.value : '';
    if (!r){ r = { id: g('r-id'), clause: '—', ver: 0 }; ST.rules.push(r); }
    Object.assign(r, { name, cat: g('r-cat'), value: g('r-val'), scope: g('r-scope'), eff: g('r-eff'), status: g('r-st'), ver: r.ver + 1 });
    log(null, (id ? 'Rule updated ' : 'Rule created ') + r.id, { old, nw: r.value + ' · v' + r.ver, reason: 'Effective ' + r.eff, ref: r.id }); closeModal(); toast('Rule ' + r.id + ' saved as v' + r.ver); render(); },
  slaEdit(){ const s = ST.cfg.sla; openModal(mHead('Edit SLA', 'Hours') + `<div class="m-b form2">${[['rmResponse', 'RM initial response'], ['reminder', 'Reminder before expiry'], ['esc1', 'First escalation'], ['esc2', 'Second escalation'], ['caseTAT', 'Case turnaround']].map(([k, l]) => `<div><label class="lbl">${l}</label><input id="sla-${k}" type="number" value="${s[k]}"></div>`).join('')}</div><div class="m-f"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="A.saveSla()">Save SLA</button></div>`); },
  saveSla(){ const s = ST.cfg.sla, old = JSON.stringify(s); Object.keys(s).forEach(k => s[k] = +document.getElementById('sla-' + k).value || s[k]); log(null, 'SLA configuration updated', { old, nw: JSON.stringify(s), ref: 'SLA-RM-001' }); ST.rules.find(r => r.id === 'SLA-RM-001').value = s.rmResponse + ' hours'; closeModal(); toast('SLA saved'); render(); },
  setThreshold(v){ const old = ST.cfg.reviewThreshold; ST.cfg.reviewThreshold = +v; ST.rules.find(r => r.id === 'VAL-CNF-001').value = v + '%'; log(null, 'Extraction review threshold changed', { old: old + '%', nw: v + '%', ref: 'VAL-CNF-001' }); ST.cases.filter(c => c.received).forEach(c => syncExceptions(c)); toast('Review threshold set to ' + v + '%'); render(); },

  /* ----- upload ----- */
  upload(bid){
    const nr = ST.cases.filter(c => !c.received), sel = bid ? caseByB(bid) : nr[0];
    if (!sel || sel.received){ openModal(mHead('Upload stock statement') + `<div class="m-b">${emptyState('All August statements are in', 'Every demo borrower has submitted. Reset the demo to replay the upload.')}</div>`); return; }
    const b = sel.bor;
    openModal(mHead('Upload stock statement', 'Create or receive a stock statement case') + `<div class="m-b"><div class="form2">
      <div class="full"><label class="lbl">Borrower</label><select id="u-b" onchange="A.upload(this.value)">${BORROWERS.map(x => { const c = caseByB(x.id); return `<option value="${x.id}" ${x.id === b.id ? 'selected' : ''} ${c.received ? 'disabled' : ''}>${esc(x.name)}${c.received ? ' — Aug statement received' : ''}</option>`; }).join('')}</select></div>
      <div><label class="lbl">Customer ID</label><input value="${b.cust}" readonly></div><div><label class="lbl">Account</label><input value="${b.acct}" readonly></div>
      <div><label class="lbl">Facility</label><input value="Cash Credit · ${cr(sel.sanction)}" readonly></div><div><label class="lbl">Statement month</label><select><option>Aug 2026</option></select></div>
      <div><label class="lbl">Submission type</label><select id="u-st"><option>Email ingestion</option><option>Branch scan</option><option>Customer portal</option></select></div><div><label class="lbl">Original / revised</label><select><option>Original</option><option>Revised</option></select></div>
      <div><label class="lbl">Received from</label><input id="u-from" value="${esc(sel.from)}"></div><div><label class="lbl">RM</label><input value="${esc(b.rm)}" readonly></div>
      <div><label class="lbl">Credit analyst</label><input value="${ROLES.analyst.name}" readonly></div></div>
      <label class="drop" id="drop" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="event.preventDefault();this.classList.remove('over');A.fileChosen(event.dataTransfer.files[0])">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx" hidden onchange="A.fileChosen(this.files[0])">${icon('upload', 24)}<b>Drop the statement here or browse</b><span class="fine muted">PDF, scanned PDF, JPG, PNG, XLS / XLSX</span><span id="u-file" class="file" hidden></span></label>
      <button class="btn sm ghost" onclick="A.fileChosen({name:'${b.short.replace(/\s/g, '_')}_Stock_Statement_Aug2026.pdf'})">Use sample file</button></div>
      <div class="m-f"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="u-go" disabled onclick="A.process('${sel.id}')">Upload and process</button></div>`, { wide: true });
  },
  fileChosen(f){ if (!f) return; const el = document.getElementById('u-file'); el.hidden = false; el.innerHTML = icon('file', 13) + ' ' + esc(f.name); A._file = f.name; document.getElementById('u-go').disabled = false; },
  process(cid){
    const c = CASE(cid), from = document.getElementById('u-from').value;
    const steps = ['Upload received', 'Document quality assessment', 'Page orientation', 'Page classification', 'OCR extraction', 'Table extraction', 'Signature / stamp detection', 'Data normalisation', 'Arithmetic validation', 'CAM/DN comparison', 'Exception creation'];
    const detail = [A._file, 'Quality ' + c.quality + '%', 'All pages upright', c.pages.length + ' pages classified', c.fields.length + ' key fields', '3 schedules, ' + (c.stock.length + c.debtors.length + c.creditors.length) + ' rows', 'Checked ' + c.pages.filter(p => p.sigReq).length + ' signatory blocks', 'Mapped to unified statement', 'Line items recalculated', '10 CAM/DN parameters', ''];
    document.querySelector('.modal').innerHTML = mHead('Processing ' + esc(c.bor.name), A._file) + `<div class="m-b"><div class="pbar"><span id="pb"></span></div><ol class="proc">${steps.map((s, i) => `<li id="ps-${i}"><span>${s}</span><em>${esc(detail[i])}</em></li>`).join('')}</ol></div><div class="m-f" id="p-f"></div>`;
    c.processing = true;
    steps.forEach((_, i) => setTimeout(() => { document.getElementById('ps-' + i).className = 'run'; if (i) document.getElementById('ps-' + (i - 1)).className = 'ok'; document.getElementById('pb').style.width = ((i + 1) / steps.length * 100) + '%'; }, i * 330));
    setTimeout(() => {
      c.processing = false; c.received = true; c.receivedAt = tick(1); c.from = from;
      log(c, 'Stock statement received (original, v1)', { user: 'System (Prism Intake)', role: 'System', nw: A._file + ' · uploaded by ' + ROLES[ST.role].name, ms: 'Received', min: 0 });
      log(c, 'Document intelligence completed', { user: 'System (Prism IDP)', role: 'System', nw: 'Overall confidence ' + DocumentIntelligenceService.calculateConfidence(c) + '% · quality ' + c.quality + '%', ms: 'Processed', min: 1 });
      syncExceptions(c, false); c.excs.forEach(e => { e.createdAt = SIM_NOW; e.trail[0].ts = SIM_NOW; log(c, 'Exception raised: ' + e.title, { user: 'System (Credit Rule Engine)', role: 'System', nw: e.id + ' · ' + e.sev, ref: e.id, ms: 'Exception raised', min: 0 }); });
      delete c._hist; notify('New statement processed for ' + c.bor.name + ' — ' + c.excs.length + ' exception(s).', { page: 'case', id: c.id });
      document.getElementById('ps-' + (steps.length - 1)).className = 'ok'; document.querySelector('#ps-' + (steps.length - 1) + ' em').textContent = c.excs.length + ' exception(s) raised';
      const di = DocumentIntelligenceService.analyseDocument(c);
      document.getElementById('p-f').innerHTML = `<span class="fine">${c.pages.length} pages · confidence ${di.overall}% · ${di.checks.filter(x => x.status !== 'PASS').length} document issue(s) · ${c.excs.length} exception(s) · case ${c.id}</span><button class="btn primary" onclick="closeModal();A.go({page:'case',id:'${c.id}'})">Open case</button>`;
      render(); toast('Case ' + c.id + ' created');
    }, steps.length * 330 + 250);
  },
};
function findEx(id){ for (const c of ST.cases){ const e = c.excs.find(x => x.id === id); if (e) return { c, e }; } }
function keepDraft(e){ const t = document.getElementById('rm-text'); if (t) e._draftText = t.value; }
function after(c, prev){ const now = caseStatus(c); if (now !== prev && now === 'Ready for DP') { log(c, 'All exceptions settled — ready for DP', { user: 'System (Workflow)', role: 'System', min: 0 }); notify(c.bor.name + ' is ready for DP.', { page: 'case', id: c.id, tab: 'dp' }); } }
function scrollTop(){ const m = document.getElementById('main'); m && m.scrollTo && m.scrollTo(0, 0); }

document.addEventListener('click', e => {
  if (!e.target.closest('.gsearch')){ const r = document.getElementById('gs-res'); if (r) r.hidden = true; }
  if (!e.target.closest('.bell') && !e.target.closest('.notif-p')){ const p = document.getElementById('notif-p'); if (p) p.hidden = true; }
  if (!e.target.closest('.psw')){ const m = document.getElementById('psw-m'); if (m) m.hidden = true; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
initState(); render();
