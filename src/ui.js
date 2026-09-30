'use strict';
const STATUS_CLS = {
  'Not Received': 'grey', 'Received': 'blue', 'Processing': 'blue', 'Validation Review': 'amber', 'Exception Review': 'amber', 'Awaiting RM': 'amber',
  'RM Responded': 'violet', 'Credit Review': 'blue', 'Ready for DP': 'teal', 'Awaiting Approval': 'violet', 'Approved': 'teal', 'Limit Update Pending': 'blue',
  'Limit Update Failed': 'red', 'Completed': 'green', 'Open': 'amber', 'Sent to RM': 'blue', 'Resolved': 'green', 'Auto-cleared': 'grey',
  'PASS': 'green', 'FAIL': 'red', 'REVIEW': 'amber', 'MISMATCH': 'red', 'PENDING': 'amber', 'Critical': 'red', 'High': 'orange', 'Medium': 'amber', 'Low': 'grey',
  'On track': 'green', 'Warning': 'amber', 'Breached': 'red', 'Met': 'green', 'SUCCESS': 'green', 'FAILED': 'red', 'MANUAL': 'amber', 'Active': 'green', 'Draft': 'amber', 'Inactive': 'grey',
};
const badge = (s, extra = '') => `<span class="badge b-${STATUS_CLS[s] || 'grey'} ${extra}">${esc(s)}</span>`;
const sevDot = s => `<span class="sev sev-${(s || '').toLowerCase()}" title="${esc(s)}"></span>`;
function confPill(v){ const b = confBand(v); return `<span class="conf conf-${b}" title="${b === 'high' ? 'High' : b === 'mod' ? 'Moderate' : 'Review required'} confidence">${v}%</span>`; }
const icon = (n, s = 16) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  inbox: '<path d="M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z M14 3v5h5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.3 3.5 5"/>',
  alert: '<path d="M12 3l9.5 17h-19z M12 10v4 M12 17.5v.5"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>', checkc: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', pulse: '<path d="M3 12h4l3-7 4 14 3-7h4"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>', sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>', task: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 17v3h16v-3"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', chev: '<path d="M9 6l6 6-6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', play: '<path d="M7 4l13 8-13 8z"/>', layers: '<path d="M12 3l9 5-9 5-9-5z M3 13l9 5 9-5"/>',
};

/* ---------- Charts ---------- */
function lineChart({ labels, series, h = 230, fmt = v => cr(v), zero = false, compact = false }){
  const W = 640, H = h, pl = 64, pr = 14, pt = 12, pb = 26;
  const all = series.flatMap(s => s.values).filter(v => v != null);
  let mn = Math.min(...all), mx = Math.max(...all); if (zero) mn = 0;
  const pad = (mx - mn) * 0.12 || Math.abs(mx) * 0.1 || 1; mx += pad; if (!zero) mn -= pad;
  const x = i => pl + (W - pl - pr) * (labels.length === 1 ? 0.5 : i / (labels.length - 1));
  const y = v => pt + (H - pt - pb) * (1 - (v - mn) / (mx - mn));
  let g = '';
  for (let i = 0; i <= 4; i++){ const v = mn + (mx - mn) * i / 4, yy = y(v); g += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" class="gl"/><text x="${pl - 8}" y="${yy + 4}" class="ax" text-anchor="end">${esc(fmt(v))}</text>`; }
  labels.forEach((l, i) => { if (labels.length <= 12 || i % 2 === 0) g += `<text x="${x(i)}" y="${H - 7}" class="ax" text-anchor="middle">${esc(l)}</text>`; });
  const paths = series.map(s => {
    const pts = s.values.map((v, i) => v == null ? null : [x(i), y(v)]).filter(Boolean);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const dots = s.values.map((v, i) => v == null ? '' : `<circle cx="${x(i)}" cy="${y(v)}" r="${compact ? 2 : 3}" style="fill:var(--surface);stroke:${s.color};stroke-width:2"><title>${esc(s.name + ' · ' + labels[i] + ': ' + fmt(v))}</title></circle>`).join('');
    return `<path d="${d}" style="fill:none;stroke:${s.color};stroke-width:${s.w || 2};${s.dash ? 'stroke-dasharray:5 4' : ''}"/>${dots}`;
  }).join('');
  const legend = series.length > 1 ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet">${g}${paths}</svg>${legend}</div>`;
}
function hBars(items, { fmt = v => v, color = 'var(--primary)', max } = {}){
  const m = max ?? Math.max(...items.map(i => i.v));
  return `<div class="hbars">${items.map(i => `<div class="hbar" ${i.onclick ? `onclick="${i.onclick}" role="button" tabindex="0"` : ''}><span class="hl-l">${esc(i.l)}</span><span class="hl-t"><span style="width:${Math.max(2, i.v / m * 100)}%;background:${i.c || color}"></span></span><span class="hl-v num">${fmt(i.v)}</span></div>`).join('')}</div>`;
}
function funnel(items){
  const m = items[0].v;
  return `<div class="funnel">${items.map((i, idx) => { const conv = idx ? Math.round(i.v / items[idx - 1].v * 100) : 100;
    return `<div class="fn-row"><span class="fn-l">${esc(i.l)}</span><span class="fn-t"><span style="width:${i.v / m * 100}%"><b class="num">${i.v}</b></span></span><span class="fn-c muted num">${idx ? conv + '%' : ''}</span></div>`; }).join('')}</div>`;
}
function waterfall(steps){
  const W = 760, H = 270, pl = 8, pr = 8, pt = 26, pb = 58, n = steps.length, bw = (W - pl - pr) / n;
  let run = 0; const bars = [];
  steps.forEach(s => { if (s.t === 'total'){ bars.push({ ...s, a: 0, b: s.v }); run = s.v; } else if (s.t === 'minus'){ bars.push({ ...s, a: run - s.v, b: run }); run -= s.v; } else if (s.t === 'plus'){ bars.push({ ...s, a: run, b: run + s.v }); run += s.v; } else if (s.t === 'start'){ bars.push({ ...s, a: 0, b: s.v }); run = s.v; } });
  const mx = Math.max(...bars.map(b => b.b)) * 1.08; const y = v => pt + (H - pt - pb) * (1 - v / mx);
  let out = `<line x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}" class="gl"/>`;
  bars.forEach((b, i) => {
    const x = pl + i * bw + bw * 0.14, w = bw * 0.72;
    const col = b.t === 'minus' ? 'var(--red)' : b.t === 'plus' ? 'var(--teal)' : b.hi ? 'var(--navy-accent)' : 'var(--primary)';
    out += `<rect x="${x}" y="${y(b.b)}" width="${w}" height="${Math.max(1, y(b.a) - y(b.b))}" rx="2" style="fill:${col};opacity:${b.t === 'minus' ? 0.85 : 1}"><title>${esc(b.l + ': ' + cr(b.v))}</title></rect>`;
    out += `<text x="${x + w / 2}" y="${y(b.b) - 7}" class="wf-v" text-anchor="middle">${b.t === 'minus' ? '−' : ''}${esc(trimDec(b.v / 1e7))}</text>`;
    const words = b.l.split(' '); let line = '', lines = []; words.forEach(wd => { if ((line + ' ' + wd).trim().length > 12){ lines.push(line.trim()); line = wd; } else line += ' ' + wd; }); lines.push(line.trim());
    lines.slice(0, 3).forEach((ln, j) => out += `<text x="${x + w / 2}" y="${H - pb + 16 + j * 12}" class="ax" text-anchor="middle">${esc(ln)}</text>`);
    if (i < bars.length - 1 && steps[i + 1].t !== 'total' && steps[i + 1].t !== 'start'){ const nb = bars[i + 1]; const lvl = b.t === 'minus' ? b.a : b.b; out += `<line x1="${x + w}" x2="${x + bw}" y1="${y(lvl)}" y2="${y(lvl)}" style="stroke:var(--muted);stroke-dasharray:2 2"/>`; }
  });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Drawing power waterfall, values in ₹ crore">${out}</svg><div class="legend"><span><i style="background:var(--primary)"></i>Totals (₹ Cr)</span><span><i style="background:var(--red)"></i>Deductions</span><span><i style="background:var(--navy-accent)"></i>Drawing power</span></div></div>`;
}
function spark(vals, color = 'var(--primary)'){
  const W = 90, H = 26, mn = Math.min(...vals), mx = Math.max(...vals), r = mx - mn || 1;
  const d = vals.map((v, i) => (i ? 'L' : 'M') + (i * W / (vals.length - 1)).toFixed(1) + ' ' + (H - 3 - (v - mn) / r * (H - 6)).toFixed(1)).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><path d="${d}" style="fill:none;stroke:${color};stroke-width:1.6"/></svg>`;
}

/* ---------- Modal & toast ---------- */
function openModal(html, { wide = false, cls = '' } = {}){
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="mb" onclick="if(event.target===this)closeModal()"><div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  setTimeout(() => { const f = root.querySelector('input,textarea,select,button.primary'); f && f.focus(); }, 30);
}
function closeModal(){ document.getElementById('modal-root').innerHTML = ''; }
function mHead(title, sub = ''){ return `<div class="m-head"><div><h3>${title}</h3>${sub ? `<p class="muted">${sub}</p>` : ''}</div><button class="icon-btn" onclick="closeModal()" aria-label="Close">${icon('x')}</button></div>`; }
function toast(msg, kind = 'ok'){
  const t = document.createElement('div'); t.className = 'toast t-' + kind; t.innerHTML = (kind === 'ok' ? icon('checkc') : kind === 'err' ? icon('alert') : icon('info')) + '<span>' + msg + '</span>';
  document.getElementById('toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700);
}
function kv(pairs, cls = ''){ return `<dl class="kv ${cls}">${pairs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`; }
function emptyState(title, text, btn = ''){ return `<div class="empty">${icon('inbox', 28)}<h4>${title}</h4><p class="muted">${text}</p>${btn}</div>`; }
function whyBtn(key, label = 'Why?'){ return `<button class="why" onclick="A.why('${key}')">${icon('info', 13)}${label}</button>`; }
function can(role){ return ST.role === role; }
function roleGate(role, label){ return `<span class="gate">${icon('shield', 13)} ${label || ('Available to ' + ROLES[role].short)} · <a href="#" onclick="A.setRole('${role}');return false">switch role</a></span>`; }
