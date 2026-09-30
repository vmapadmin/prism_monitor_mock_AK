'use strict';
/* ================= Formatting ================= */
const L = x => Math.round(x * 1e5);           // lakhs -> rupees
const sum = a => a.reduce((s, x) => s + x, 0);
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const p2 = n => String(n).padStart(2, '0');
function fmtD(t){ const d = new Date(t); return p2(d.getDate()) + '-' + MON[d.getMonth()] + '-' + d.getFullYear(); }
function fmtDT(t){ const d = new Date(t); return fmtD(t) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
function fmtDTs(t){ const d = new Date(t); return p2(d.getDate()) + '-' + MON[d.getMonth()] + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
function trimDec(n, max = 3, min = 2){ let s = n.toFixed(max); while (s.includes('.') && s.split('.')[1].length > min && s.endsWith('0')) s = s.slice(0, -1); return s; }
const inr = v => (v < 0 ? '−' : '') + '₹' + Math.abs(Math.round(v)).toLocaleString('en-IN');
const cr = v => (v < 0 ? '−' : '') + '₹' + trimDec(Math.abs(v) / 1e7) + ' Cr';
const lk = v => (v < 0 ? '−' : '') + '₹' + trimDec(Math.abs(v) / 1e5, 2, 2) + ' L';
const amt = v => Math.abs(v) >= 1e7 ? cr(v) : lk(v);
const pct = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '0.0') + '%';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STMT_DATE = new Date('2026-08-31T00:00:00').getTime();
const DAY = 864e5, HR = 36e5;

/* ================= Simulated clock ================= */
let SIM_NOW;
function tick(m = 3){ SIM_NOW += m * 60000; return SIM_NOW; }

/* ================= People & roles ================= */
const ROLES = {
  analyst: { name: 'Priya Nair', title: 'Credit Analyst / Reviewer', short: 'Credit Analyst', ini: 'PN' },
  rm:      { name: 'Rahul Mehta', title: 'Relationship Manager', short: 'Relationship Manager', ini: 'RM' },
  checker: { name: 'Sanjay Kulkarni', title: 'Credit Checker / Approver (AGM – Credit)', short: 'Credit Checker', ini: 'SK' },
  risk:    { name: 'Anita Desai', title: 'Credit Monitoring / Risk', short: 'Credit Monitoring', ini: 'AD' },
  ops:     { name: 'Vikram Joshi', title: 'Credit Operations', short: 'Operations', ini: 'VJ' },
  admin:   { name: 'Meera Iyer', title: 'Administrator', short: 'Administrator', ini: 'MI' },
  auditor: { name: 'R. Subramanian', title: 'Internal Auditor (read-only)', short: 'Auditor', ini: 'RS' },
};
const RMS = ['Rahul Mehta','Kavita Rao','Nikhil Shah','Arvind Kumar','Sneha Reddy','Aman Verma','Debashis Sen','Harpreet Singh'];

/* ================= CAM defaults ================= */
const DEFAULT_CAM = {
  facility: 'Cash Credit', stockMargin: 25, recMargin: 30, recAge: 90,
  eligibleCats: ['Raw Material','Work in Progress','Finished Goods','Packing Material','Stores & Spares'],
  gitEligible: false, excludeRelated: true, deductCreditors: true,
  camDate: '2026-03-18', dnDate: '2026-04-02', amendment: 'None', version: 'CAM v1.0 · DN v1.0',
};
const CLAUSE = { elig: 'Section 7.1', margin: 'Section 7.2', age: 'Section 7.3', related: 'Section 7.4', cred: 'Section 7.5', git: 'Section 7.6', cap: 'Section 8.1', submit: 'Section 9.2' };

/* ================= Seed builders ================= */
function S(cat, rep, sub){ return { cat, rep: L(rep * 100), sub: sub ? sub.map(([name, v]) => ({ name, amt: L(v * 100) })) : null }; }  // crore
function D(name, inv, a, age, o = {}){ return { name, inv, amt: L(a), age, related: !!o.rel, disputedAge: o.disp ?? null, acceptedAge: null }; }
function C(name, a, stock, custDed){ return { name, amt: L(a * 100), stock, custDed }; }  // crore
const PAGES8 = ['Stock Summary','Inventory Details','Debtor Ageing Schedule','Debtor Ageing Summary','Creditor Details','Bank Limits & DP Working','Declaration','Annexure'];
const SIG_REQ = ['Stock Summary','Debtor Ageing Summary','Bank Limits & DP Working','Declaration'];
const STAMP_REQ = ['Stock Summary','Declaration'];

const BORROWERS = [
  { id:'B001', cust:'CIF40021873', name:'Apex Auto Components Pvt Ltd', seg:'Mid Corporate', ind:'Auto Components', branch:'Pune Corporate Banking', zone:'Pune', region:'West', rm:'Rahul Mehta', rating:'PB-4 (BBB)', acct:'0412-CC-0098771', short:'Apex Auto' },
  { id:'B002', cust:'CIF40033410', name:'Nova Engineering Industries Ltd', seg:'Mid Corporate', ind:'Industrial Machinery', branch:'Mumbai – Andheri MCG', zone:'Mumbai', region:'West', rm:'Kavita Rao', rating:'PB-3 (A-)', acct:'0107-CC-0044127', short:'Nova Engg' },
  { id:'B003', cust:'CIF40051298', name:'Zenith Packaging Pvt Ltd', seg:'SME', ind:'Packaging', branch:'Ahmedabad Commercial', zone:'Ahmedabad', region:'West', rm:'Nikhil Shah', rating:'PB-5 (BBB-)', acct:'0233-CC-0071904', short:'Zenith Pack' },
  { id:'B004', cust:'CIF40061127', name:'Shreeji Polymers Pvt Ltd', seg:'SME', ind:'Plastics & Polymers', branch:'Ahmedabad Commercial', zone:'Ahmedabad', region:'West', rm:'Nikhil Shah', rating:'PB-4 (BBB)', acct:'0233-CC-0080316', short:'Shreeji' },
  { id:'B005', cust:'CIF40072954', name:'Kaveri Textiles Ltd', seg:'Mid Corporate', ind:'Textiles', branch:'Coimbatore Commercial', zone:'Coimbatore', region:'South', rm:'Arvind Kumar', rating:'PB-5 (BBB-)', acct:'0518-CC-0012288', short:'Kaveri Tex' },
  { id:'B006', cust:'CIF40080431', name:'Orion Pharmachem Pvt Ltd', seg:'SME', ind:'Pharma Intermediates', branch:'Hyderabad Commercial', zone:'Hyderabad', region:'South', rm:'Sneha Reddy', rating:'PB-4 (BBB)', acct:'0611-CC-0030457', short:'Orion' },
  { id:'B007', cust:'CIF40091176', name:'Deccan Steel Fabricators Pvt Ltd', seg:'SME', ind:'Steel Fabrication', branch:'Pune Corporate Banking', zone:'Pune', region:'West', rm:'Rahul Mehta', rating:'PB-5 (BBB-)', acct:'0412-CC-0101945', short:'Deccan Steel' },
  { id:'B008', cust:'CIF40102283', name:'Meridian Foods Pvt Ltd', seg:'Mid Corporate', ind:'Food Processing', branch:'Gurugram Corporate', zone:'Delhi NCR', region:'North', rm:'Aman Verma', rating:'PB-3 (A-)', acct:'0305-CC-0057720', short:'Meridian' },
  { id:'B009', cust:'CIF40113569', name:'Sterling Electricals Ltd', seg:'SME', ind:'Electrical Equipment', branch:'Kolkata Commercial', zone:'Kolkata', region:'East', rm:'Debashis Sen', rating:'PB-5 (BBB-)', acct:'0702-CC-0019833', short:'Sterling' },
  { id:'B010', cust:'CIF40124418', name:'Horizon Agro Exports Pvt Ltd', seg:'Mid Corporate', ind:'Agri Commodities', branch:'Gurugram Corporate', zone:'Delhi NCR', region:'North', rm:'Aman Verma', rating:'PB-4 (BBB)', acct:'0305-CC-0062214', short:'Horizon Agro' },
  { id:'B011', cust:'CIF40135702', name:'Vardhman Castings Ltd', seg:'Mid Corporate', ind:'Foundry & Castings', branch:'Ludhiana Industrial', zone:'Ludhiana', region:'North', rm:'Harpreet Singh', rating:'PB-6 (BB+)', acct:'0344-CC-0008815', short:'Vardhman' },
  { id:'B012', cust:'CIF40146690', name:'Bluewave Plastics Pvt Ltd', seg:'SME', ind:'Plastics Moulding', branch:'Mumbai – Andheri MCG', zone:'Mumbai', region:'West', rm:'Kavita Rao', rating:'PB-5 (BBB-)', acct:'0107-CC-0050982', short:'Bluewave' },
  { id:'B013', cust:'CIF40157324', name:'Pinnacle Tools Pvt Ltd', seg:'SME', ind:'Machine Tools', branch:'Pune Corporate Banking', zone:'Pune', region:'West', rm:'Rahul Mehta', rating:'PB-4 (BBB)', acct:'0412-CC-0092410', short:'Pinnacle' },
];
const B = id => BORROWERS.find(b => b.id === id);

function caseSpecs(){
  const t = s => new Date(s).getTime();
  return [
    { id:'SS-2026-000348', b:'B001', excBase:485, scenario:'Golden path', received:t('2026-09-19T16:40:00'), from:'accounts@apexauto.in', mode:'fresh',
      sanction:10, operative:10, outstanding:8.70, quality:91,
      stock:[ S('Raw Material',3.12,[['Steel coils & bars',1.84],['Aluminium ingots',0.78],['Bought-out components',0.50]]),
              S('Work in Progress',1.93,[['WIP – Machining shop',1.02],['WIP – Assembly line',0.84]]),
              S('Finished Goods',2.94), S('Packing Material',0.21), S('Stores & Spares',0.12), S('Goods in Transit',0.43) ],
      debtors:[ D('Tata Motors Ltd','INV-A1123',98,24), D('Mahindra & Mahindra Ltd','INV-A1141',86,38), D('Bajaj Auto Ltd','INV-A1158',74,52),
                D('Ashok Leyland Ltd','INV-A1167',62,17), D('Force Motors Ltd','INV-A1172',48,66), D('TVS Motor Company Ltd','INV-A1175',35,12),
                D('Hyundai Motor India Ltd','INV-A1181',22,8), D('Minda Industries Ltd','INV-A1051',10,96,{disp:78}), D('Minda Industries Ltd','INV-A1052',2.5,96,{disp:78}),
                D('Escorts Kubota Ltd','INV-A0988',28,128), D('Eicher Motors Ltd','INV-A1003',22,104), D('Hero Electric Vehicles','INV-A0961',12.5,147),
                D('Apex Precision Tools Pvt Ltd','INV-A1160',20,45,{rel:true}) ],
      creditors:[ C('Bharat Steel Traders',0.42,true,true), C('Kalyani Alloys Pvt Ltd',0.35,true,true), C('Sundram Fastener Supplies',0.20,true,true),
                  C('Pune Castings & Forgings',0.18,true,false), C('Shree Packaging Co.',0.10,true,true), C('Siemens Ltd (capex – CNC line)',0.22,false,false), C('Metro Facility Services',0.04,false,false) ],
      fieldOv:{ debtorTotal:{ extracted:L(528), conf:67 } }, pageConf:[98,97,95,84,96,97,93,62],
      rmSeed:{ OVERAGED:{ text:'Customer confirms ₹12.5 lakh (Minda Industries, INV-A1051 and INV-A1052) was aged from dispatch date. Under the agreed terms, ageing runs from buyer acceptance (GRN), which puts both invoices at 78 days. GRN acceptance notes attached. Balance of ₹65 lakh remains overdue and the customer is following up.', files:['Minda_GRN_acceptance_A1051.pdf','Minda_GRN_acceptance_A1052.jpg'], claim:12.5 },
               CRED_SHORT:{ text:'Customer confirms Pune Castings & Forgings ₹18 lakh is an unpaid raw-material supply. It was left out of the DP working by clerical oversight. A revised creditor schedule will follow with the September statement.', files:['Apex_creditor_confirmation.pdf'] } },
      hist:{ dp:[9.62,9.78,9.95,10.10,10.34,10.48,10.21,10.05,10.12,10.31,10.06], overShare:[4.1,4.4,4.8,5.2,5.0,5.6,6.1,6.4,6.8,8.3,10.2], exc:[0,1,0,1,0,0,1,1,0,2,1], delay:[0,0,2,0,0,1,0,0,3,0,0] } },

    { id:'SS-2026-000351', b:'B002', excBase:501, scenario:'Missing signature', received:t('2026-09-20T11:15:00'), from:'finance@novaengg.co.in', mode:'fresh',
      sanction:6, operative:5.10, outstanding:4.40, quality:86, pageTypes:['Stock Summary','Inventory Details','Debtor Ageing Summary','Creditor Details','Bank Limits & DP Working','Declaration'],
      unsigned:[3], pageConf:[97,96,88,95,96,61],
      stock:[ S('Raw Material',1.85), S('Work in Progress',0.92), S('Finished Goods',1.40), S('Packing Material',0.08), S('Stores & Spares',0.10) ],
      debtors:[ D('Larsen & Toubro Ltd','INV-N2231',95,28), D('Bharat Heavy Electricals Ltd','INV-N2244',72,41), D('Thermax Ltd','INV-N2250',64,57), D('Kirloskar Brothers Ltd','INV-N2263',61,73), D('Voltas Ltd','INV-N2170',18,112) ],
      creditors:[ C('JSW Steel Ltd',0.48,true,true), C('Hindalco Industries Ltd',0.30,true,true), C('Local job-work vendors',0.17,true,true) ],
      fieldOv:{ declaration:{ conf:61 } },
      rmSeed:{ SIGNATURE:{ text:'Customer has re-executed Page 3 (Debtor Ageing Summary) under the authorised signatory, Mr. Anil Deshpande (Director). Signed page uploaded.', files:['Nova_SS_Aug26_Page3_signed.pdf'] }, OVERAGED:{ text:'Voltas invoice INV-N2170 is under a quality dispute. Customer accepts exclusion from DP.', files:[] } },
      hist:{ profile:'stable' } },

    { id:'SS-2026-000356', b:'B003', excBase:505, scenario:'Arithmetic error', received:t('2026-09-20T15:50:00'), from:'accounts@zenithpack.com', mode:'fresh',
      sanction:7.5, operative:6.95, outstanding:5.90, quality:94, stockTotal:6.84, pageConf:[97,98,97,96,97,98,96,90],
      stock:[ S('Raw Material',2.64), S('Work in Progress',1.12), S('Finished Goods',2.48), S('Packing Material',0.34), S('Stores & Spares',0.15) ],
      debtors:[ D('Hindustan Unilever Ltd','INV-Z7710',110,22), D('ITC Ltd','INV-Z7724',95,35), D('Dabur India Ltd','INV-Z7731',70,48), D('Marico Ltd','INV-Z7745',65,61) ],
      creditors:[ C('Century Pulp & Paper',0.62,true,true), C('JK Paper Ltd',0.38,true,true), C('Siegwerk Inks India',0.10,true,true) ],
      hist:{ profile:'volatile', excPattern:[0,1,0,0,1,0,0,1,1,0,1] } },

    { id:'SS-2026-000339', b:'B004', excBase:470, scenario:'Clean statement', received:t('2026-09-17T12:20:00'), from:'accounts@shreejipoly.in', mode:'ready',
      sanction:4, operative:3.12, outstanding:2.95, quality:97, pageConf:[99,98,98,97,98,99,98,95],
      stock:[ S('Raw Material',1.40), S('Work in Progress',0.55), S('Finished Goods',1.05), S('Packing Material',0.10) ],
      debtors:[ D('Supreme Industries Ltd','INV-S3301',62,19), D('Finolex Industries Ltd','INV-S3312',55,33), D('Astral Ltd','INV-S3320',43,47), D('Prince Pipes & Fittings','INV-S3327',30,62) ],
      creditors:[ C('Reliance Polymers',0.40,true,true), C('GAIL (India) Ltd',0.20,true,true) ],
      hist:{ profile:'rising' } },

    { id:'SS-2026-000312', b:'B005', excBase:441, scenario:'Overdue debtors', received:t('2026-09-15T10:05:00'), from:'cfo@kaveritex.com', mode:'sentRM', sentAt:t('2026-09-21T09:00:00'),
      sanction:12, operative:10.40, outstanding:8.60, quality:92, pageConf:[97,96,95,94,96,97,95,88],
      stock:[ S('Raw Material',4.20), S('Work in Progress',1.60), S('Finished Goods',3.80), S('Packing Material',0.20) ],
      debtors:[ D('Arvind Ltd','INV-K5102',145,31), D('Raymond Ltd','INV-K5117',120,44), D('Welspun India Ltd','INV-K5125',95,67), D('Trident Ltd','INV-K5133',85,88),
                D('Siyaram Silk Mills','INV-K4980',80,104), D('Loyal Textile Mills','INV-K4912',65,131), D('Nahar Spinning Mills','INV-K4855',50,166) ],
      creditors:[ C('Cotton Corporation of India',1.20,true,true), C('Aditya Birla Fibres',0.60,true,true), C('Colourtex Dyes',0.30,true,true) ],
      hist:{ profile:'debtorStress', delay:[0,2,0,4,0,6,0,3,11,0,0] } },

    { id:'SS-2026-000327', b:'B006', excBase:452, scenario:'Missing declaration', received:t('2026-09-18T14:30:00'), from:'finance@orionpharmachem.com', mode:'sentRM', sentAt:t('2026-09-21T13:05:00'),
      sanction:5, operative:3.80, outstanding:3.40, quality:93, pageTypes:['Stock Summary','Inventory Details','Debtor Ageing Schedule','Debtor Ageing Summary','Creditor Details','Bank Limits & DP Working','Annexure'], pageConf:[97,96,96,95,96,97,90],
      stock:[ S('Raw Material',1.60), S('Work in Progress',0.70), S('Finished Goods',1.20), S('Packing Material',0.10) ],
      debtors:[ D('Sun Pharmaceutical Industries','INV-O6120',80,26), D('Aurobindo Pharma Ltd','INV-O6133',70,45), D("Divi's Laboratories",'INV-O6141',60,70), D('Laurus Labs Ltd','INV-O6010',10,118) ],
      creditors:[ C('Deepak Nitrite Ltd',0.50,true,true), C('Aarti Industries Ltd',0.30,true,true) ],
      hist:{ profile:'stable' } },

    { id:'SS-2026-000331', b:'B007', excBase:460, scenario:'Creditor adjustment', received:t('2026-09-18T17:10:00'), from:'accounts@deccansteelfab.in', mode:'rmResponded', sentAt:t('2026-09-21T11:20:00'),
      sanction:3.5, operative:3.10, outstanding:2.30, quality:95, pageConf:[98,97,97,96,95,97,97,91],
      stock:[ S('Raw Material',1.40), S('Work in Progress',0.60), S('Finished Goods',0.90) ],
      debtors:[ D('Kalpataru Projects Intl','INV-D8810',55,29), D('Shapoorji Pallonji & Co','INV-D8824',50,52), D('KEC International Ltd','INV-D8833',45,74) ],
      creditors:[ C('Steel Authority of India',0.55,true,true), C('Jindal Steel & Power',0.40,true,false) ],
      rmSeed:{ CRED_SHORT:{ text:'Customer confirms Jindal Steel & Power ₹40 lakh is an unpaid HR-coil supply dated 18-Aug-2026. It was omitted from the DP working in error. Customer accepts deduction.', files:['Deccan_JSPL_ledger_Aug26.xlsx'] } },
      hist:{ profile:'stable' } },

    { id:'SS-2026-000298', b:'B008', excBase:411, scenario:'CAM / DP methodology difference', received:t('2026-09-12T11:40:00'), from:'treasury@meridianfoods.in', mode:'submitted',
      sanction:9, operative:7.10, outstanding:6.40, quality:96, custSM:20, pageConf:[98,98,97,97,97,98,97,93],
      stock:[ S('Raw Material',3.20), S('Work in Progress',0.80), S('Finished Goods',3.10), S('Packing Material',0.30) ],
      debtors:[ D('Avenue Supermarts (DMart)','INV-M9011',120,18), D('Reliance Retail Ltd','INV-M9025',110,37), D('Innovative Retail (BigBasket)','INV-M9037',80,52), D("Spencer's Retail Ltd",'INV-M9042',50,71) ],
      creditors:[ C('Haryana Farmers Producer Co-op',0.90,true,true), C('Tetra Pak India',0.40,true,true), C('Dhampur Sugar Mills',0.30,true,true) ],
      hist:{ profile:'stable' } },

    { id:'SS-2026-000362', b:'B009', excBase:512, scenario:'Low OCR confidence', received:t('2026-09-21T18:25:00'), from:'Scanned via Kolkata branch', mode:'validation',
      sanction:4.5, operative:3.40, outstanding:3.10, quality:58, scanned:true, pageConf:[71,76,79,74,82,69,85,60],
      stock:[ S('Raw Material',1.40), S('Work in Progress',0.50), S('Finished Goods',1.25), S('Packing Material',0.15) ],
      debtors:[ D('CESC Ltd','INV-T4401',70,33), D('WBSEDCL','INV-T4415',60,58), D('Tata Power Company','INV-T4420',45,40), D('Havells India Ltd','INV-T4432',25,80) ],
      creditors:[ C('Polycab India Ltd',0.40,true,true), C('Hindustan Copper Ltd',0.30,true,true) ],
      fieldOv:{ stockTotal:{ extracted:L(338), conf:71 }, debtorTotal:{ conf:74 }, outstanding:{ extracted:L(370), conf:69 } },
      hist:{ profile:'stable' } },

    { id:'SS-2026-000344', b:'B010', excBase:480, scenario:'Revised statement', received:t('2026-09-17T09:45:00'), from:'finance@horizonagro.in', mode:'validation', version:2,
      priorVersion:{ received:t('2026-09-10T16:20:00'), stockTotal:6.55, reason:'Customer revised finished goods valuation (lower-of-cost-or-NRV) and reclassified ₹0.30 Cr as goods in transit.' },
      sanction:8, operative:5.60, outstanding:5.10, quality:95, pageConf:[97,97,96,95,96,97,96,92],
      stock:[ S('Raw Material',3.10), S('Finished Goods',2.80), S('Goods in Transit',0.30) ],
      debtors:[ D('Olam Agri India','INV-H3301',100,25), D('ADM Agro Industries','INV-H3317',90,40), D('Cargill India Pvt Ltd','INV-H3325',90,63) ],
      creditors:[ C('Mandi commission agents (various)',0.80,true,true), C('Warehousing Corp. of India',0.40,true,true) ],
      fieldOv:{ stockTotal:{ conf:78 } },
      hist:{ profile:'stable' } },

    { id:'SS-2026-000282', b:'B011', excBase:395, scenario:'Significant DP reduction', received:t('2026-09-11T13:00:00'), from:'accounts@vardhmancastings.com', mode:'limitFailed',
      sanction:15, operative:14.20, outstanding:11.00, quality:90, pageTypes:[...PAGES8.slice(0,7),'Annexure – Invoice listing'], annexSpan:[8,86], pageConf:[96,95,94,93,95,96,95,88],
      stock:[ S('Raw Material',3.10), S('Work in Progress',1.90), S('Finished Goods',7.80) ],
      debtors:[ D('Maruti Suzuki India','INV-V1201',160,35), D('Tata Motors Ltd','INV-V1215',140,49), D('Escorts Kubota Ltd','INV-V1222',120,77), D('JCB India Ltd','INV-V1110',70,102), D('Sonalika Tractors','INV-V1066',50,139) ],
      creditors:[ C('Sponge iron suppliers (various)',1.80,true,true), C('Kalinga Pig Iron',1.20,true,true), C('Met-coke suppliers',0.60,true,true) ],
      hist:{ profile:'sharp' } },

    { id:'SS-2026-000371', b:'B012', excBase:520, scenario:'Not yet received', notReceived:true, from:'accounts@bluewaveplastics.in', mode:'fresh',
      sanction:3, operative:2.35, outstanding:2.10, quality:93, nostamp:[1], pageConf:[96,95,95,94,95,96,94,90],
      stock:[ S('Raw Material',1.10), S('Work in Progress',0.35), S('Finished Goods',0.85), S('Packing Material',0.10) ],
      debtors:[ D('Nilkamal Ltd','INV-W2210',55,27), D('Cello World Ltd','INV-W2221',45,44), D('Hamilton Housewares (Milton)','INV-W2230',30,58) ],
      creditors:[ C('Haldia Petrochemicals',0.35,true,true), C('Masterbatch suppliers',0.20,true,true) ],
      hist:{ profile:'stable' } },

    { id:'SS-2026-000276', b:'B013', excBase:402, scenario:'Completed case', received:t('2026-09-09T10:30:00'), from:'accounts@pinnacletools.in', mode:'completed',
      sanction:5, operative:4.20, outstanding:3.80, quality:97, pageConf:[98,98,97,97,98,98,98,94],
      stock:[ S('Raw Material',1.80), S('Work in Progress',0.70), S('Finished Goods',1.40), S('Packing Material',0.20) ],
      debtors:[ D('Bosch Ltd','INV-P5501',100,22), D('Schaeffler India','INV-P5513',90,41), D('SKF India Ltd','INV-P5520',60,59) ],
      creditors:[ C('Tata Steel Ltd',0.60,true,true), C('Carbide inserts suppliers',0.40,true,true) ],
      hist:{ profile:'stable' } },
  ];
}

/* ================= State ================= */
let ST;
function buildCase(s){
  const bor = B(s.b);
  const types = s.pageTypes || PAGES8;
  const pages = types.map((type, i) => ({
    n: i + 1, type, conf: s.pageConf?.[i] ?? 95,
    sigReq: SIG_REQ.includes(type), signed: !(s.unsigned || []).includes(i + 1),
    stampReq: STAMP_REQ.includes(type), stamped: !(s.nostamp || []).includes(i + 1),
    span: (type.startsWith('Annexure – Invoice') && s.annexSpan) ? s.annexSpan : null,
    skew: s.scanned ? [-1.6, 1.1, -0.8, 2.2, -1.2, 1.8, -0.6, 2.8][i] : 0,
  }));
  const pageOf = t => (pages.find(p => p.type === t) || pages[0]).n;
  const stockRep = sum(s.stock.map(r => r.rep));
  const debtSum = sum(s.debtors.map(d => d.amt));
  const credSum = sum(s.creditors.map(c => c.amt));
  const custDed = sum(s.creditors.filter(c => c.stock && c.custDed).map(c => c.amt));
  const stockTotalRep = s.stockTotal ? L(s.stockTotal * 100) : stockRep;
  const fields = [
    { key:'stmtDate', name:'Statement date', page:1, region:'title', type:'text', extracted:'31-Aug-2026', conf:99 },
    { key:'stockTotal', name:'Total stock (summary)', page:1, region:'total', type:'amt', extracted:stockTotalRep, truth:stockTotalRep, conf:98 },
    { key:'debtorTotal', name:'Total book debts', page:pageOf('Debtor Ageing Summary'), region:'total', type:'amt', extracted:debtSum, truth:debtSum, conf:97 },
    { key:'credTotal', name:'Total creditors', page:pageOf('Creditor Details'), region:'total', type:'amt', extracted:credSum, truth:credSum, conf:97 },
    { key:'sanction', name:'Sanctioned limit (as stated)', page:pageOf('Bank Limits & DP Working'), region:'sanction', type:'amt', extracted:L(s.sanction * 100), conf:99 },
    { key:'outstanding', name:'Outstanding (as stated)', page:pageOf('Bank Limits & DP Working'), region:'outstanding', type:'amt', extracted:L(s.outstanding * 100), truth:L(s.outstanding * 100), conf:98 },
  ];
  if (types.includes('Declaration')) fields.push({ key:'declaration', name:'Declaration clause', page:pageOf('Declaration'), region:'declaration', type:'text', extracted:'Present – signed by authorised signatory', conf:96 });
  fields.forEach(f => { Object.assign(f, (s.fieldOv || {})[f.key] || {}); f.reviewed = false; f.validated = null; f.id = s.id + '-' + f.key; });
  return {
    id: s.id, bId: s.b, bor, scenario: s.scenario, month: 'Aug 2026', version: s.version || 1, priorVersion: s.priorVersion || null,
    received: !s.notReceived, receivedAt: s.received || null, dueDate: new Date('2026-09-20T23:59:00').getTime(), from: s.from, submissionType: s.version > 1 ? 'Revised' : 'Original',
    sanction: L(s.sanction * 100), operative: L(s.operative * 100), cbsOutstanding: L(s.outstanding * 100), quality: s.quality, scanned: !!s.scanned,
    pages, stock: s.stock, stockTotalRep, debtors: s.debtors, creditors: s.creditors, custDed,
    custSM: s.custSM ?? 25, custRM: 30, fields,
    cam: { ...DEFAULT_CAM, approvalRef: 'CC/' + bor.zone.slice(0, 3).toUpperCase() + '/2026/' + s.id.slice(-3) },
    ovr: {}, excs: [], excBase: s.excBase, rmSeed: s.rmSeed || {}, spec: s,
    submission: null, approval: null, limit: null, returned: false, comments: [], attachments: [],
  };
}

function initState(){
  SIM_NOW = new Date('2026-09-22T10:05:00').getTime();
  ST = {
    role: 'analyst', rmIdentity: 'Rahul Mehta', route: { page: 'overview' },
    cases: [], audit: [], notifs: [], excCounter: 530, auditCounter: 1,
    cfg: { reviewThreshold: 80, highThreshold: 95, arithTol: 1000, sla: { rmResponse: 24, reminder: 4, esc1: 24, esc2: 48, caseTAT: 72 } },
    rules: seedRules(), ui: { qf: {}, ef: {}, af: {}, hl: null, page: 1, sim: null, drill: [] },
  };
  for (const s of caseSpecs()){
    const c = buildCase(s); ST.cases.push(c);
    if (c.received) seedProgress(c, s);
  }
  seedNotifs();
}
const CASE = id => ST.cases.find(c => c.id === id);
const caseByB = bid => ST.cases.find(c => c.bId === bid);

/* ================= Audit ================= */
function log(c, action, o = {}){
  const r = ROLES[ST.role];
  const ev = { id: 'AE-' + String(ST.auditCounter++).padStart(6, '0'), ts: o.ts ?? tick(o.min ?? 2), user: o.user ?? (ST.role === 'rm' ? (c?.bor.rm || r.name) : r.name), role: o.role ?? r.short,
    action, old: o.old ?? '', nw: o.nw ?? '', reason: o.reason ?? '', ref: o.ref ?? (c ? c.id : ''), caseId: c ? c.id : null, milestone: o.ms || null };
  ST.audit.push(ev); return ev;
}
function notify(text, route, kind = 'info'){ ST.notifs.unshift({ id: Math.random().toString(36).slice(2), text, route, kind, ts: SIM_NOW, read: false }); }

/* ================= Document Intelligence Service (mock adapter) ================= */
const DocumentIntelligenceService = {
  provider: 'Prism IDP · mock adapter v0.9 (deterministic JSON)',
  adapters: ['Azure Document Intelligence', 'AWS Textract', 'Google Document AI', 'Tesseract', 'LLM / Vision API'],
  analyseDocument(c){ return { pages: this.classifyPages(c), checks: this.validations(c), fields: this.extractFields(c), overall: this.calculateConfidence(c), quality: c.quality }; },
  classifyPages(c){ return c.pages; },
  extractFields(c){ return c.fields; },
  extractTables(c){ return { stock: c.stock, debtors: c.debtors, creditors: c.creditors }; },
  detectSignature(c){ const miss = c.pages.filter(p => p.sigReq && !p.signed); return { status: miss.length ? 'FAIL' : 'PASS', missing: miss.map(p => p.n) }; },
  detectStamp(c){ const miss = c.pages.filter(p => p.stampReq && !p.stamped); return { status: miss.length ? 'FAIL' : 'PASS', missing: miss.map(p => p.n) }; },
  detectDeclaration(c){ const p = c.pages.find(p => p.type === 'Declaration'); if (!p) return { status: 'FAIL', page: null };
    const f = c.fields.find(f => f.key === 'declaration'); return { status: f && fieldPending(f) ? 'REVIEW' : 'PASS', page: p.n, conf: f?.conf }; },
  extractCAMTerms(c){ return c.cam; },
  calculateConfidence(c){ let w = 0, s = 0; c.pages.forEach(p => { const wt = p.type.startsWith('Annexure') ? 0.25 : 1; w += wt; s += p.conf * wt; }); return Math.round(s / w); },
  validations(c){
    const sig = this.detectSignature(c), st = this.detectStamp(c), dec = this.detectDeclaration(c);
    const need = ['Stock Summary', 'Debtor Ageing Summary', 'Creditor Details', 'Bank Limits & DP Working', 'Declaration'];
    const missing = need.filter(t => !c.pages.some(p => p.type === t));
    return [
      { key: 'letterhead', label: 'Letterhead', status: 'PASS', page: 1, region: 'letterhead', detail: 'Company letterhead detected on page 1' },
      { key: 'signature', label: 'Signature', status: sig.status, page: sig.missing[0] || 1, region: 'signature', detail: sig.missing.length ? 'No signature on mandatory page ' + sig.missing.join(', ') : 'Signed on all ' + c.pages.filter(p => p.sigReq).length + ' mandatory pages' },
      { key: 'stamp', label: 'Company stamp', status: st.status, page: st.missing[0] || 1, region: 'stamp', detail: st.missing.length ? 'Stamp not found on page ' + st.missing.join(', ') : 'Stamp present on summary and declaration' },
      { key: 'declaration', label: 'Declaration', status: dec.status, page: dec.page || c.pages.length, region: 'declaration', detail: dec.status === 'FAIL' ? 'Declaration page not found in submission' : dec.status === 'REVIEW' ? 'Declaration detected at ' + dec.conf + '% confidence — confirm' : 'Borrower declaration present and signed' },
      { key: 'sequence', label: 'Page sequence', status: 'PASS', page: 1, region: 'pageno', detail: c.pages.length + ' pages in order, no gaps' },
      { key: 'sections', label: 'Mandatory sections', status: missing.length ? 'FAIL' : 'PASS', page: 1, region: 'table', detail: missing.length ? 'Missing: ' + missing.join(', ') : 'Stock, debtors, creditors, bank limits and declaration all present' },
    ];
  },
};
function fieldPending(f){ return !f.reviewed && f.conf < ST.cfg.reviewThreshold; }
function fieldVal(c, key){ const f = c.fields.find(f => f.key === key); if (!f) return null; return f.reviewed ? f.validated : f.extracted; }
function isPending(c, key){ const f = c.fields.find(f => f.key === key); return f ? fieldPending(f) : false; }
function pendingFields(c){ return c.fields.filter(fieldPending); }
function confBand(v){ return v >= ST.cfg.highThreshold ? 'high' : v >= ST.cfg.reviewThreshold ? 'mod' : 'low'; }

/* ================= Credit Rule Engine (deterministic) ================= */
const CreditRuleEngine = {
  validateStock(c, sim = {}){
    const cam = c.cam;
    const rows = c.stock.map(r => {
      const recalc = r.sub ? sum(r.sub.map(x => x.amt)) : r.rep;
      let elig = r.cat === 'Goods in Transit' ? (cam.gitEligible || !!c.ovr.GIT) : cam.eligibleCats.includes(r.cat);
      const reason = elig ? 'Eligible category (' + CLAUSE.elig + ')' : r.cat === 'Goods in Transit' ? 'Goods in transit not eligible (' + CLAUSE.git + ')' : 'Category not eligible under CAM';
      return { ...r, recalc, elig, eligAmt: elig ? recalc : 0, reason };
    });
    return rows;
  },
  validateReceivables(c, sim = {}){
    const cam = c.cam;
    let realise = sim.realise || 0;
    return c.debtors.map(d => {
      const effAge = d.acceptedAge ?? d.age;
      let elig = true, reason = 'Within ' + cam.recAge + ' days';
      if (d.related && cam.excludeRelated && !c.ovr.RELATED){ elig = false; reason = 'Related-party receivable (' + CLAUSE.related + ')'; }
      else if (effAge > cam.recAge && !c.ovr.OVERAGED){ elig = false; reason = 'Aged ' + effAge + ' days > ' + cam.recAge + ' (' + CLAUSE.age + ')'; }
      if (d.acceptedAge != null && elig) reason = 'Re-aged to ' + effAge + ' days from GRN acceptance (RM evidence accepted)';
      let eligAmt = elig ? d.amt : 0, simAdd = 0;
      if (!elig && !d.related && realise > 0){ simAdd = Math.min(realise, d.amt); realise -= simAdd; }
      return { ...d, effAge, elig, reason, eligAmt, simAdd, bucket: effAge <= 30 ? '0–30' : effAge <= 60 ? '31–60' : effAge <= 90 ? '61–90' : effAge <= 120 ? '91–120' : '>120' };
    });
  },
  validateCreditors(c, sim = {}){
    const pctDed = sim.credPct ?? 100;
    return c.creditors.map(x => {
      const ded = c.cam.deductCreditors && x.stock && !c.ovr.CRED ? Math.round(x.amt * pctDed / 100) : 0;
      return { ...x, ded, status: x.stock ? (x.custDed ? 'Deducted by customer' : 'Not deducted by customer') : 'Not stock-related' };
    });
  },
  applyMargins(base, pctM){ const m = Math.round(base * pctM / 100); return { margin: m, net: base - m }; },
  applySanctionCap(dp, sanction){ return Math.min(dp, sanction); },
  calculateDP(c, sim = {}){
    const rows = this.validateStock(c, sim);
    const grossStock = sum(rows.map(r => r.recalc)) + (sim.stockAdj || 0);
    const ineligibleStock = sum(rows.filter(r => !r.elig).map(r => r.recalc));
    const eligibleStock = grossStock - ineligibleStock;
    const creds = this.validateCreditors(c, sim);
    const creditors = sum(creds.map(x => x.ded));
    const netStock = Math.max(0, eligibleStock - creditors);
    const sm = sim.stockMargin ?? c.cam.stockMargin, rmP = sim.recMargin ?? c.cam.recMargin;
    const sM = this.applyMargins(netStock, sm);
    const debts = this.validateReceivables(c, sim);
    const grossRec = sum(debts.map(d => d.amt));
    const overaged = sum(debts.filter(d => !d.elig && !d.related).map(d => d.amt));
    const related = sum(debts.filter(d => !d.elig && d.related).map(d => d.amt));
    const simAdd = sum(debts.map(d => d.simAdd));
    const eligibleRec = grossRec - overaged - related + simAdd;
    const rM = this.applyMargins(eligibleRec, rmP);
    const calculatedDP = sM.net + rM.net;
    const recommended = this.applySanctionCap(calculatedDP, c.sanction);
    return { rows, grossStock, ineligibleStock, eligibleStock, creds, creditors, netStock, stockMarginPct: sm, stockMarginAmt: sM.margin, stockDP: sM.net,
      debts, grossRec, overaged, related, simAdd, eligibleRec, recMarginPct: rmP, recMarginAmt: rM.margin, recDP: rM.net,
      calculatedDP, sanction: c.sanction, recommended, capped: calculatedDP > c.sanction, existing: c.operative, change: recommended - c.operative,
      outstanding: c.cbsOutstanding, shortfall: Math.max(0, c.cbsOutstanding - recommended) };
  },
  arithmeticChecks(c){
    const tol = ST.cfg.arithTol, out = [];
    const rows = c.stock.map(r => ({ ...r, recalc: r.sub ? sum(r.sub.map(x => x.amt)) : r.rep }));
    rows.filter(r => r.sub).forEach(r => out.push({ id: 'AR-ROW-' + r.cat.slice(0, 3).toUpperCase(), group: 'Stock', rule: 'Sub-schedule carried to summary', desc: r.cat + ': Inventory Details (page 2) → Stock Summary (page 1)', page: 2, reported: r.rep, system: r.recalc, lines: r.sub }));
    const stPend = isPending(c, 'stockTotal');
    out.push({ id: 'AR-STK-TOT', group: 'Stock', rule: 'Grand total', desc: 'Stock Summary total vs sum of system-recalculated line items', page: 1, reported: fieldVal(c, 'stockTotal'), system: sum(rows.map(r => r.recalc)), pending: stPend, key: 'stockTotal' });
    out.push({ id: 'AR-STK-COL', group: 'Stock', rule: 'Column footing', desc: 'Stock Summary total vs sum of customer-reported line items', page: 1, reported: fieldVal(c, 'stockTotal'), system: sum(rows.map(r => r.rep)), pending: stPend, key: 'stockTotal' });
    const dSum = sum(c.debtors.map(d => d.amt));
    out.push({ id: 'AR-DEB-TOT', group: 'Debtors', rule: 'Schedule total', desc: 'Debtor Ageing Summary total vs invoice-level schedule', page: c.fields.find(f => f.key === 'debtorTotal').page, reported: fieldVal(c, 'debtorTotal'), system: dSum, pending: isPending(c, 'debtorTotal'), key: 'debtorTotal' });
    out.push({ id: 'AR-DEB-BKT', group: 'Debtors', rule: 'Ageing buckets', desc: 'Sum of ageing buckets vs schedule total', page: c.fields.find(f => f.key === 'debtorTotal').page, reported: dSum, system: dSum });
    out.push({ id: 'AR-CRD-TOT', group: 'Creditors', rule: 'Schedule total', desc: 'Creditor Details total vs line items', page: c.fields.find(f => f.key === 'credTotal').page, reported: fieldVal(c, 'credTotal'), system: sum(c.creditors.map(x => x.amt)), pending: isPending(c, 'credTotal'), key: 'credTotal' });
    out.forEach(o => { o.diff = (o.reported ?? 0) - o.system; o.status = o.pending ? 'PENDING' : Math.abs(o.diff) > tol ? 'MISMATCH' : 'PASS'; });
    return out;
  },
  evaluateExceptions(c){
    const k = this.calculateDP(c), ar = this.arithmeticChecks(c), res = [];
    const di = DocumentIntelligenceService;
    const stockTot = ar.find(a => a.id === 'AR-STK-TOT');
    if (stockTot.status === 'MISMATCH') res.push({ key: 'ARITH_STOCK', cat: 'Arithmetic', sev: Math.abs(stockTot.diff) > L(10) ? 'High' : 'Medium', rmReq: false, page: 1 });
    if (ar.find(a => a.id === 'AR-DEB-TOT').status === 'MISMATCH') res.push({ key: 'ARITH_DEBT', cat: 'Data Inconsistency', sev: 'Medium', rmReq: false, page: c.fields.find(f => f.key === 'debtorTotal').page });
    if (ar.find(a => a.id === 'AR-CRD-TOT').status === 'MISMATCH') res.push({ key: 'ARITH_CRED', cat: 'Arithmetic', sev: 'Medium', rmReq: false, page: c.fields.find(f => f.key === 'credTotal').page });
    if (c.stock.some(r => r.cat === 'Goods in Transit' && r.rep > 0) && !c.cam.gitEligible) res.push({ key: 'GIT', cat: 'Stock Eligibility', sev: 'Medium', rmReq: false, page: 1 });
    if (c.debtors.some(d => !d.related && d.age > c.cam.recAge)) res.push({ key: 'OVERAGED', cat: 'Debtor Eligibility', sev: 'High', rmReq: true, page: c.fields.find(f => f.key === 'debtorTotal').page });
    if (c.debtors.some(d => d.related) && c.cam.excludeRelated) res.push({ key: 'RELATED', cat: 'Debtor Eligibility', sev: 'Medium', rmReq: false, page: c.fields.find(f => f.key === 'debtorTotal').page });
    if (c.creditors.some(x => x.stock && !x.custDed)) res.push({ key: 'CRED_SHORT', cat: 'Creditor Treatment', sev: 'High', rmReq: true, page: c.fields.find(f => f.key === 'credTotal').page });
    if (c.custSM !== c.cam.stockMargin || c.custRM !== c.cam.recMargin) res.push({ key: 'MARGIN', cat: 'CAM/DN Compliance', sev: 'High', rmReq: false, page: c.fields.find(f => f.key === 'sanction').page });
    const sig = di.detectSignature(c); if (sig.status === 'FAIL') res.push({ key: 'SIGNATURE', cat: 'Signature/Stamp', sev: 'Critical', rmReq: true, page: sig.missing[0] });
    const st = di.detectStamp(c); if (st.status === 'FAIL') res.push({ key: 'STAMP', cat: 'Signature/Stamp', sev: 'High', rmReq: true, page: st.missing[0] });
    if (!c.pages.some(p => p.type === 'Declaration')) res.push({ key: 'DECLARATION', cat: 'Document Completeness', sev: 'Critical', rmReq: true, page: c.pages.length });
    if (!isPending(c, 'outstanding') && Math.abs(fieldVal(c, 'outstanding') - c.cbsOutstanding) > ST.cfg.arithTol) res.push({ key: 'OS_MISMATCH', cat: 'Limit/Outstanding', sev: 'High', rmReq: false, page: c.fields.find(f => f.key === 'outstanding').page });
    if (k.shortfall > 0) res.push({ key: 'DP_BELOW_OS', cat: 'Limit/Outstanding', sev: 'Critical', rmReq: false, page: c.fields.find(f => f.key === 'outstanding').page });
    return res;
  },
};
const CRE = CreditRuleEngine;

const EXC_TITLES = {
  ARITH_STOCK: 'Stock total does not reconcile to line items', ARITH_DEBT: 'Debtor summary total differs from invoice schedule', ARITH_CRED: 'Creditor total differs from schedule',
  GIT: 'Goods in transit included in stock', OVERAGED: 'Over-aged receivables included in eligible debtors', RELATED: 'Related-party receivables included',
  CRED_SHORT: 'Unpaid stock creditors not deducted', MARGIN: 'Statement applies margins different from CAM', SIGNATURE: 'Mandatory page not signed',
  STAMP: 'Company stamp missing', DECLARATION: 'Borrower declaration missing', OS_MISMATCH: 'Stated outstanding differs from core banking', DP_BELOW_OS: 'Outstanding exceeds recommended drawing power',
};
const OVERRIDABLE = ['GIT', 'OVERAGED', 'RELATED', 'CRED_SHORT'];

function syncExceptions(c, auto = true){
  const conds = CRE.evaluateExceptions(c);
  for (const cond of conds){
    if (c.excs.some(e => e.key === cond.key)) continue;
    const num = c.excs.length === 0 && c.excBase ? c.excBase : (c._nextExc ?? ST.excCounter++);
    c._nextExc = num + 1;
    const ex = { id: 'EX-2026-' + String(num).padStart(5, '0'), caseId: c.id, key: cond.key, cat: cond.cat, sev: cond.sev, rmReq: cond.rmReq, page: cond.page, title: EXC_TITLES[cond.key],
      status: 'Open', createdAt: SIM_NOW, sentAt: null, dueAt: null, rm: null, decision: null, comments: [], trail: [{ s: 'Raised', ts: SIM_NOW, by: 'Credit Rule Engine' }] };
    c.excs.push(ex);
    if (auto) log(c, 'Exception raised: ' + ex.title, { user: 'System (Credit Rule Engine)', role: 'System', nw: ex.id + ' · ' + ex.sev, ref: ex.id, min: 0 });
  }
  for (const ex of c.excs){
    if (ex.status === 'Open' && !conds.some(k => k.key === ex.key)){
      ex.status = 'Auto-cleared'; ex.trail.push({ s: 'Auto-cleared', ts: SIM_NOW, by: 'Credit Rule Engine' });
      if (auto) log(c, 'Exception auto-cleared (condition no longer holds)', { user: 'System (Credit Rule Engine)', role: 'System', ref: ex.id, min: 0 });
    }
  }
  c._nextExc = Math.max(c._nextExc || 0, ST.excCounter);
}

/* Dynamic exception content, always from the live engine */
function exView(c, ex){
  const k = CRE.calculateDP(c), cam = c.cam, ar = CRE.arithmeticChecks(c);
  const sm = cam.stockMargin, rmp = cam.recMargin, keep = (v, m) => Math.round(v * (100 - m) / 100);
  switch (ex.key){
    case 'ARITH_STOCK': { const a = ar.find(x => x.id === 'AR-STK-TOT'); const d = Math.abs(a.diff);
      return { cust: 'Total stock ' + cr(a.reported), sys: 'Recalculated ' + cr(a.system) + ' (difference ' + lk(d) + ')', camReq: 'Statement totals must reconcile to schedules (' + CLAUSE.submit + ')', impact: keep(d, sm), impactNote: lk(d) + ' × (1 − ' + sm + '% margin)', treat: 'System uses recalculated line items; customer total ignored', clause: CLAUSE.submit, rule: 'VAL-ARI-001' }; }
    case 'ARITH_DEBT': { const a = ar.find(x => x.id === 'AR-DEB-TOT');
      return { cust: 'Summary total ' + cr(a.reported), sys: 'Schedule total ' + cr(a.system), camReq: 'Summary must agree to invoice schedule', impact: 0, impactNote: 'No DP impact — DP uses invoice-level schedule', treat: 'Invoice schedule used', clause: CLAUSE.submit, rule: 'VAL-ARI-002' }; }
    case 'ARITH_CRED': { const a = ar.find(x => x.id === 'AR-CRD-TOT'); return { cust: cr(a.reported), sys: cr(a.system), camReq: 'Totals must reconcile', impact: 0, impactNote: '—', treat: 'Line items used', clause: CLAUSE.submit, rule: 'VAL-ARI-003' }; }
    case 'GIT': { const g = sum(k.rows.filter(r => r.cat === 'Goods in Transit').map(r => r.recalc));
      return { cust: 'Goods in transit ' + lk(g) + ' included in stock', sys: c.ovr.GIT ? 'Included (override)' : 'Excluded from eligible stock', camReq: 'Goods in transit not eligible (' + CLAUSE.git + ')', impact: c.ovr.GIT ? 0 : keep(g, sm), impactNote: lk(g) + ' × (1 − ' + sm + '%)', treat: 'Excluded', clause: CLAUSE.git, rule: 'DP-STK-002' }; }
    case 'OVERAGED': { const initial = sum(c.debtors.filter(d => !d.related && d.age > cam.recAge).map(d => d.amt));
      return { cust: 'Receivables > ' + cam.recAge + ' days ' + lk(initial) + ' included', sys: c.ovr.OVERAGED ? 'Included (override)' : 'Excluded ' + lk(k.overaged) + (k.overaged !== initial ? ' (after RM evidence)' : ''), camReq: 'Receivables above ' + cam.recAge + ' days are not eligible for DP (' + CLAUSE.age + ')', impact: c.ovr.OVERAGED ? 0 : keep(k.overaged, rmp), impactNote: lk(k.overaged) + ' × (1 − ' + rmp + '% margin)', treat: 'Excluded from eligible debtors', clause: CLAUSE.age, rule: 'DP-REC-001' }; }
    case 'RELATED': return { cust: 'Related-party receivables ' + lk(sum(c.debtors.filter(d => d.related).map(d => d.amt))) + ' included', sys: c.ovr.RELATED ? 'Included (override)' : 'Excluded ' + lk(k.related), camReq: 'Related-party receivables not eligible (' + CLAUSE.related + ')', impact: c.ovr.RELATED ? 0 : keep(k.related, rmp), impactNote: lk(k.related) + ' × (1 − ' + rmp + '%)', treat: 'Excluded', clause: CLAUSE.related, rule: 'DP-REC-002' };
    case 'CRED_SHORT': { const req = sum(c.creditors.filter(x => x.stock).map(x => x.amt)); const short = req - c.custDed;
      return { cust: 'Creditors deducted ' + cr(c.custDed), sys: c.ovr.CRED ? 'Not deducted (override)' : 'Deduct ' + cr(req) + ' (all unpaid stock creditors)', camReq: 'Deduct unpaid stock creditors (' + CLAUSE.cred + ')', impact: c.ovr.CRED ? 0 : keep(short, sm), impactNote: lk(short) + ' short-deducted × (1 − ' + sm + '%)', treat: 'Full deduction applied', clause: CLAUSE.cred, rule: 'DP-CRD-001' }; }
    case 'MARGIN': { const imp = Math.round(k.netStock * (cam.stockMargin - c.custSM) / 100);
      return { cust: 'Stock margin ' + c.custSM + '% applied in DP working', sys: 'CAM margin ' + cam.stockMargin + '% applied', camReq: 'Stock margin ' + cam.stockMargin + '% (' + CLAUSE.margin + ')', impact: imp, impactNote: cr(k.netStock) + ' × ' + (cam.stockMargin - c.custSM) + '% margin gap', treat: 'CAM margin applied', clause: CLAUSE.margin, rule: 'DP-STK-003' }; }
    case 'SIGNATURE': { const p = c.pages.find(p => p.n === ex.page);
      return { cust: 'Page ' + ex.page + ' (' + (p?.type || '') + ') ' + (p?.signed ? 'now signed' : 'unsigned'), sys: 'No signature detected in signatory block', camReq: 'All summary pages signed by authorised signatory (' + CLAUSE.submit + ')', impact: null, impactNote: 'DP cannot be finalised until regularised', treat: 'Hold DP finalisation', clause: CLAUSE.submit, rule: 'DOC-MAN-001' }; }
    case 'STAMP': return { cust: 'Page ' + ex.page + ' without company stamp', sys: 'Stamp not detected', camReq: 'Company stamp on summary and declaration', impact: null, impactNote: 'Document compliance only', treat: 'Hold DP finalisation', clause: CLAUSE.submit, rule: 'DOC-MAN-001' };
    case 'DECLARATION': return { cust: 'No declaration page in submission', sys: 'Declaration section not found in ' + c.pages.length + ' pages', camReq: 'Signed borrower declaration mandatory (' + CLAUSE.submit + ')', impact: null, impactNote: 'DP cannot be finalised until received', treat: 'Hold DP finalisation', clause: CLAUSE.submit, rule: 'DOC-MAN-001' };
    case 'OS_MISMATCH': return { cust: 'Stated outstanding ' + cr(fieldVal(c, 'outstanding')), sys: 'Core banking outstanding ' + cr(c.cbsOutstanding), camReq: 'Statement outstanding must agree to bank records', impact: 0, impactNote: 'No DP impact — CBS figure used', treat: 'CBS figure used', clause: CLAUSE.submit, rule: 'VAL-OS-001' };
    case 'DP_BELOW_OS': return { cust: 'Outstanding ' + cr(c.cbsOutstanding), sys: 'Recommended DP ' + cr(k.recommended) + (k.shortfall ? ' · shortfall ' + lk(k.shortfall) : ' · now covered'), camReq: 'Outstanding must remain within DP (' + CLAUSE.cap + ')', impact: k.shortfall, impactNote: 'Irregularity to be regularised by borrower', treat: 'Flag irregularity to RM and approver', clause: CLAUSE.cap, rule: 'DP-CAP-002' };
  }
  return { cust: '', sys: '', camReq: '', impact: null };
}

/* ================= Case status (derived, never stored) ================= */
function caseStatus(c){
  if (!c.received) return 'Not Received';
  if (c.processing) return 'Processing';
  if (c.limit?.status === 'SUCCESS') return 'Completed';
  if (c.limit && ['FAILED', 'MANUAL'].includes(c.limit.status)) return 'Limit Update Failed';
  if (c.approval?.decision === 'Approved') return 'Limit Update Pending';
  if (c.submission && !c.returned) return 'Awaiting Approval';
  if (pendingFields(c).length) return 'Validation Review';
  if (c.excs.some(e => e.status === 'Sent to RM')) return 'Awaiting RM';
  if (c.excs.some(e => e.status === 'RM Responded')) return 'RM Responded';
  if (c.excs.some(e => e.status === 'Open')) return c.returned ? 'Credit Review' : 'Exception Review';
  if (c.returned) return 'Credit Review';
  return 'Ready for DP';
}
const STAGES = ['Received', 'Validation', 'Exceptions', 'RM clarification', 'Drawing power', 'Approval', 'Limit update', 'Closed'];
function stageIdx(st){ return ({ 'Not Received': -1, 'Processing': 0, 'Validation Review': 1, 'Exception Review': 2, 'Credit Review': 2, 'Awaiting RM': 3, 'RM Responded': 3, 'Ready for DP': 4, 'Awaiting Approval': 5, 'Limit Update Pending': 6, 'Limit Update Failed': 6, 'Completed': 7 })[st]; }
function openExcs(c){ return c.excs.filter(e => ['Open', 'Sent to RM', 'RM Responded'].includes(e.status)); }
function caseSLA(c){
  const st = caseStatus(c);
  if (st === 'Not Received') { const late = SIM_NOW - c.dueDate; return late > 0 ? { s: 'Breached', t: 'Overdue ' + dur(late) } : { s: 'On track', t: 'Due ' + fmtD(c.dueDate) }; }
  if (['Completed'].includes(st)) return { s: 'Met', t: 'Closed' };
  const rmEx = c.excs.filter(e => e.status === 'Sent to RM');
  if (rmEx.length){ const due = Math.min(...rmEx.map(e => e.dueAt)); const left = due - SIM_NOW; return left < 0 ? { s: 'Breached', t: 'RM SLA breached by ' + dur(-left) } : { s: left < ST.cfg.sla.reminder * HR ? 'Warning' : 'On track', t: 'RM due in ' + hm(left) }; }
  const due = c.receivedAt + ST.cfg.sla.caseTAT * HR, left = due - SIM_NOW;
  if (['Awaiting Approval', 'Limit Update Pending', 'Limit Update Failed'].includes(st)) return { s: 'On track', t: 'With ' + (st === 'Awaiting Approval' ? 'checker' : 'operations') };
  return left < 0 ? { s: 'Breached', t: 'TAT breached by ' + dur(-left) } : { s: left < 8 * HR ? 'Warning' : 'On track', t: 'Due in ' + hm(left) };
}
function dur(ms){ const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HR); return (d ? d + 'd ' : '') + h + 'h'; }
function hm(ms){ const h = Math.floor(ms / HR), m = Math.floor((ms % HR) / 60000); return p2(h) + ':' + p2(m) + ' h'; }

/* ================= Workflow actions (engine-level) ================= */
function reclassifyDisputed(c, acceptedAmt){
  let left = acceptedAmt;
  for (const d of c.debtors.filter(d => d.disputedAge != null && d.acceptedAge == null)){
    if (d.amt <= left){ d.acceptedAge = d.disputedAge; left -= d.amt; }
  }
}

function seedProgress(c, s){
  const t0 = c.receivedAt;
  log(c, 'Stock statement received (' + c.submissionType.toLowerCase() + ', v' + c.version + ')', { ts: t0, user: 'System (Prism Intake)', role: 'System', nw: c.pages.length + (c.pages.some(p => p.span) ? ' page groups' : ' pages') + ' · ' + c.from, ms: 'Received' });
  if (c.priorVersion) log(c, 'Revised submission supersedes v1', { ts: t0 + 60000, user: 'System (Prism Intake)', role: 'System', old: 'v1 received ' + fmtDT(c.priorVersion.received), nw: 'v2 active', reason: c.priorVersion.reason });
  log(c, 'Document intelligence completed', { ts: t0 + 4 * 60000, user: 'System (Prism IDP)', role: 'System', nw: 'Overall confidence ' + DocumentIntelligenceService.calculateConfidence(c) + '% · quality ' + c.quality + '%', ms: 'Processed' });
  log(c, 'Arithmetic validation and CAM/DN comparison completed', { ts: t0 + 5 * 60000, user: 'System (Credit Rule Engine)', role: 'System' });
  const save = SIM_NOW; SIM_NOW = t0 + 5 * 60000;
  syncExceptions(c, false);
  c.excs.forEach(e => { e.createdAt = SIM_NOW; e.trail[0].ts = SIM_NOW; log(c, 'Exception raised: ' + e.title, { ts: SIM_NOW, user: 'System (Credit Rule Engine)', role: 'System', nw: e.id + ' · ' + e.sev, ref: e.id, ms: 'Exception raised' }); });
  const A = ROLES.analyst.name, rmN = c.bor.rm;
  let t = t0 + 26 * HR;
  const resolveAll = (except) => c.excs.filter(e => e.status === 'Open' && !(except || []).includes(e)).forEach(e => {
    e.status = 'Resolved'; e.decision = { type: 'System treatment accepted', by: A, ts: t, reason: 'System treatment consistent with CAM' };
    e.trail.push({ s: 'Resolved', ts: t, by: A }); log(c, 'Accepted system treatment', { ts: t, user: A, role: 'Credit Analyst', ref: e.id, reason: 'Consistent with CAM terms' }); t += 4 * 60000;
  });
  const m = s.mode;
  if (m === 'fresh' || m === 'validation'){ SIM_NOW = save; return; }
  if (m === 'sentRM' || m === 'rmResponded'){
    const rmEx = c.excs.filter(e => e.rmReq);
    resolveAll(rmEx);
    rmEx.forEach(e => { e.status = 'Sent to RM'; e.sentAt = s.sentAt; e.dueAt = s.sentAt + ST.cfg.sla.rmResponse * HR; e.trail.push({ s: 'Sent to RM', ts: s.sentAt, by: A });
      log(c, 'Exception sent to RM', { ts: s.sentAt, user: A, role: 'Credit Analyst', ref: e.id, nw: rmN, ms: 'Sent to RM' }); });
    if (m === 'rmResponded') rmEx.forEach(e => { const seed = c.rmSeed[e.key] || { text: 'Customer clarification attached.', files: [] }; const ts = s.sentAt + 5 * HR;
      e.status = 'RM Responded'; e.rm = { text: seed.text, files: seed.files, claim: seed.claim ? L(seed.claim) : null, by: rmN, ts }; e.trail.push({ s: 'RM Viewed', ts: ts - HR, by: rmN }, { s: 'RM Responded', ts, by: rmN });
      log(c, 'RM responded to exception', { ts, user: rmN, role: 'Relationship Manager', ref: e.id, nw: seed.files.join(', ') || 'Comment only', ms: 'RM responded' }); });
    SIM_NOW = save; return;
  }
  // ready / submitted / limitFailed / completed
  resolveAll();
  if (m === 'ready'){ SIM_NOW = save; return; }
  const k = CRE.calculateDP(c); t += 2 * HR;
  c.submission = { by: A, ts: t, rec: 'Recommend operative limit of ' + cr(k.recommended) + ' in line with CAM-compliant DP.', dp: k.recommended, calc: k.calculatedDP };
  log(c, 'DP calculated and submitted for approval', { ts: t, user: A, role: 'Credit Analyst', old: cr(c.operative), nw: cr(k.recommended), ms: 'DP calculated' });
  if (m === 'submitted'){ SIM_NOW = save; return; }
  t += 5 * HR;
  c.approval = { decision: 'Approved', by: ROLES.checker.name, ts: t, comments: 'DP recomputed per CAM. Borrower to be advised of revised operative limit.', level: approvalLevel(Math.abs(k.change)).level };
  log(c, 'DP approved (checker)', { ts: t, user: ROLES.checker.name, role: 'Credit Checker', nw: cr(k.recommended), ms: 'Approved' });
  t += 3 * HR;
  if (m === 'limitFailed'){
    c.limit = { status: 'FAILED', attempts: [{ ts: t, status: 'FAILED', msg: 'CBS-ERR-4102: Limit master locked by concurrent maintenance (branch EOD batch)' }] };
    log(c, 'Limit update sent to core banking — FAILED', { ts: t, user: ROLES.ops.name, role: 'Operations', nw: 'CBS-ERR-4102', reason: 'Limit master locked' });
  } else {
    const ref = 'CBS-UL-' + (880000 + parseInt(c.id.slice(-3)));
    c.limit = { status: 'SUCCESS', ref, ts: t, attempts: [{ ts: t, status: 'SUCCESS', msg: 'Limit updated' }] };
    log(c, 'Operative limit updated in core banking', { ts: t, user: ROLES.ops.name, role: 'Operations', old: cr(c.operative), nw: cr(k.recommended), ref, ms: 'Limit updated' });
    log(c, 'Case closed', { ts: t + 60000, user: 'System', role: 'System', ms: 'Closed' });
  }
  SIM_NOW = save;
}

function approvalLevel(reduction){
  if (reduction <= L(100)) return { level: 'L1', who: 'Credit Manager', rule: 'Limit change up to ₹1 Cr' };
  if (reduction <= L(500)) return { level: 'L2', who: 'AGM – Credit (Sanjay Kulkarni)', rule: 'Limit change ₹1 Cr – ₹5 Cr' };
  return { level: 'L3', who: 'DGM – Credit', rule: 'Limit change above ₹5 Cr' };
}

/* ================= History (12 months, reconciled per month) ================= */
const HMONTHS = ['Sep 25','Oct 25','Nov 25','Dec 25','Jan 26','Feb 26','Mar 26','Apr 26','May 26','Jun 26','Jul 26','Aug 26'];
function histOf(c){
  if (c._hist) return c._hist;
  const k = CRE.calculateDP(c), h = c.spec.hist || {}, cam = c.cam;
  const prof = h.profile || 'stable';
  const shapes = {
    stable: [0.97,0.99,1.01,1.02,1.00,1.03,1.01,0.99,1.02,1.01,1.00],
    rising: [0.86,0.88,0.90,0.91,0.93,0.94,0.95,0.96,0.97,0.98,0.99],
    volatile: [1.04,0.97,1.06,0.98,1.03,0.95,1.05,0.99,1.02,0.96,1.01],
    debtorStress: [1.12,1.13,1.12,1.11,1.12,1.10,1.10,1.09,1.08,1.09,1.07],
    sharp: [1.34,1.36,1.38,1.36,1.37,1.35,1.36,1.37,1.38,1.37,1.40],
  };
  const out = [];
  const gS = k.grossStock, eS = k.eligibleStock, cS = k.creditors, gR = k.grossRec, eR = k.eligibleRec;
  for (let i = 0; i < 11; i++){
    let stock, elS, cred, rec, elR;
    if (h.dp){ // explicit DP path: back-solve components with fixed mix
      const target = L(h.dp[i] * 100), ratio = target / k.calculatedDP;
      stock = Math.round(gS * (0.93 + 0.07 * ratio)); elS = Math.round(eS * ratio); cred = Math.round(cS * (0.9 + 0.1 * ratio));
      const stockDP = Math.round(Math.max(0, elS - cred) * (100 - cam.stockMargin) / 100);
      elR = Math.round((target - stockDP) * 100 / (100 - cam.recMargin)); rec = Math.round(elR / (1 - h.overShare[i] / 100));
    } else {
      const f = shapes[prof][i];
      const sf = prof === 'sharp' ? [1.30,1.31,1.33,1.30,1.31,1.29,1.30,1.30,1.31,1.30,1.28][i] : f;
      stock = Math.round(gS * sf); elS = Math.round(eS * sf); cred = Math.round(cS * (prof === 'debtorStress' ? 0.92 + 0.004 * i : f));
      rec = Math.round(gR * (prof === 'debtorStress' ? 0.90 + 0.01 * i : f)); const os = prof === 'debtorStress' ? [8,9,10,12,13,15,17,19,22,24,27][i] : prof === 'sharp' ? [7,8,8,9,10,11,12,13,15,17,19][i] : 3 + (i % 3);
      elR = Math.round(rec * (100 - os) / 100);
    }
    const dp = Math.round(Math.max(0, elS - cred) * (100 - cam.stockMargin) / 100) + Math.round(elR * (100 - cam.recMargin) / 100);
    const op = Math.min(dp, c.sanction);
    const osBal = Math.round(c.cbsOutstanding * (0.92 + 0.06 * Math.sin(i * 1.3)) );
    out.push({ m: HMONTHS[i], stock, elS, cred, rec, elR, over: rec - elR, dp, sanction: c.sanction, op, os: osBal,
      exc: h.excPattern ? h.excPattern[i] : h.exc ? h.exc[i] : [0,1,0,0,1,0,0,0,1,0,0][i], delay: h.delay ? h.delay[i] : 0 });
  }
  const cur = { m: HMONTHS[11], stock: k.grossStock, elS: k.eligibleStock, cred: k.creditors, rec: k.grossRec, elR: k.eligibleRec, over: k.grossRec - k.eligibleRec, dp: k.calculatedDP, sanction: c.sanction, op: k.recommended, os: c.cbsOutstanding, exc: openExcs(c).length + c.excs.filter(e => e.status === 'Resolved').length, delay: 0, current: true };
  out.push(cur);
  return out;
}

/* Early-warning observations — observable trends only */
function ewsInsights(c){
  const h = histOf(c), n = h.length, last = h[n - 1], out = [];
  const dp3 = (last.dp - h[n - 4].dp) / h[n - 4].dp * 100;
  if (dp3 <= -10) out.push({ k: 'DP deterioration', t: 'Drawing power declined ' + Math.abs(dp3).toFixed(0) + '% over three months (' + cr(h[n - 4].dp) + ' → ' + cr(last.dp) + ').', sev: 'high' });
  const s0 = h[n - 4].over / h[n - 4].rec * 100, s1 = last.over / last.rec * 100;
  if (s1 - s0 >= 3) out.push({ k: 'Debtor ageing', t: 'Ineligible receivables rose from ' + s0.toFixed(0) + '% to ' + s1.toFixed(0) + '% of book debts in three months.', sev: 'med' });
  const inv = (last.stock - h[n - 2].stock) / h[n - 2].stock * 100;
  if (inv <= -10) out.push({ k: 'Inventory decline', t: 'Gross stock fell ' + Math.abs(inv).toFixed(0) + '% month-on-month.', sev: 'high' });
  const cr3 = (last.cred - h[n - 4].cred) / h[n - 4].cred * 100;
  if (cr3 >= 12) out.push({ k: 'Creditors rising', t: 'Trade creditors up ' + cr3.toFixed(0) + '% over three months.', sev: 'med' });
  const rep = h.slice(n - 4).filter(x => x.exc > 0).length;
  const arithRep = c.spec.hist?.excPattern ? h.slice(n - 4).filter(x => x.exc > 0).length : 0;
  if (arithRep >= 3) out.push({ k: 'Repeated exceptions', t: 'Arithmetic differences reported in ' + arithRep + ' of the last 4 statements.', sev: 'med' });
  else if (rep >= 3) out.push({ k: 'Repeated exceptions', t: 'Exceptions raised in ' + rep + ' of the last 4 statements.', sev: 'low' });
  const del = Math.max(...h.map(x => x.delay));
  if (del >= 7){ const idx = h.findIndex(x => x.delay === del); out.push({ k: 'Delayed submission', t: h[idx].m.replace(' ', " '") + ' statement was submitted ' + del + ' days late.', sev: 'low' }); }
  if (last.op < c.cbsOutstanding) out.push({ k: 'Outstanding above DP', t: 'Outstanding ' + cr(c.cbsOutstanding) + ' exceeds recommended DP ' + cr(last.op) + '.', sev: 'high' });
  const drops = [n - 1, n - 2, n - 3].every(i => h[i].dp < h[i - 1].dp);
  if (drops) out.push({ k: 'Consecutive deterioration', t: 'Drawing power fell in each of the last three months.', sev: 'med' });
  return out;
}

/* ================= Config rules ================= */
function seedRules(){
  const r = (id, name, cat, value, scope, eff, clause) => ({ id, name, cat, value, scope, eff, status: 'Active', clause, ver: 1 });
  return [
    r('DP-REC-001', 'Exclude receivables older than threshold', 'Ageing', '90 days', 'Product: Cash Credit', '01-Apr-2026', CLAUSE.age),
    r('DP-REC-002', 'Exclude related-party receivables', 'Debtor eligibility', 'Excluded', 'Product: Cash Credit', '01-Apr-2026', CLAUSE.related),
    r('DP-REC-003', 'Receivable margin', 'Margins', '30%', 'Segment: SME & Mid Corporate', '01-Apr-2026', CLAUSE.margin),
    r('DP-STK-001', 'Eligible stock categories', 'Stock eligibility', 'RM, WIP, FG, Packing, Stores & Spares', 'Product: Cash Credit', '01-Apr-2026', CLAUSE.elig),
    r('DP-STK-002', 'Goods in transit eligibility', 'Stock eligibility', 'Not eligible', 'Product: Cash Credit', '01-Apr-2026', CLAUSE.git),
    r('DP-STK-003', 'Stock margin', 'Margins', '25%', 'Segment: SME & Mid Corporate', '01-Apr-2026', CLAUSE.margin),
    r('DP-CRD-001', 'Deduct unpaid stock creditors', 'Creditors', 'Full deduction from eligible stock', 'Product: Cash Credit', '01-Apr-2026', CLAUSE.cred),
    r('DP-CAP-001', 'Cap DP at sanctioned limit', 'DP formula', 'MIN(Calculated DP, Sanction)', 'All', '01-Apr-2026', CLAUSE.cap),
    r('DP-FRM-001', 'DP formula', 'DP formula', '(Elig. stock − creditors) × (1 − SM) + Elig. debtors × (1 − RM)', 'All', '01-Apr-2026', CLAUSE.cap),
    r('VAL-ARI-001', 'Arithmetic tolerance', 'Tolerances', '₹1,000', 'All', '01-Apr-2026', CLAUSE.submit),
    r('VAL-CNF-001', 'Extraction review threshold', 'Tolerances', '80%', 'All', '01-Apr-2026', '—'),
    r('DOC-MAN-001', 'Mandatory signature, stamp and declaration', 'Document', 'Summary, debtor summary, bank limits, declaration', 'All', '01-Apr-2026', CLAUSE.submit),
    r('SLA-RM-001', 'RM response SLA', 'SLA', '24 hours', 'All', '01-Apr-2026', '—'),
    r('APR-AUT-001', 'Approval authority for limit change', 'Approval authority', '≤₹1 Cr L1 · ₹1–5 Cr L2 · >₹5 Cr L3', 'All', '01-Apr-2026', '—'),
  ];
}

function seedNotifs(){
  const n = (text, route, kind, mins) => ST.notifs.push({ id: Math.random().toString(36).slice(2), text, route, kind, ts: SIM_NOW - mins * 60000, read: false });
  n('3 stock statements awaiting your validation.', { page: 'work' }, 'info', 12);
  n('RM response received for Deccan Steel Fabricators.', { page: 'case', id: 'SS-2026-000331', tab: 'exceptions' }, 'info', 48);
  n('Orion Pharmachem RM SLA expires in 3 hours.', { page: 'case', id: 'SS-2026-000327', tab: 'exceptions' }, 'warn', 5);
  n('DP approval required for Meridian Foods.', { page: 'case', id: 'SS-2026-000298', tab: 'approval' }, 'info', 95);
  n('Limit update failed for case SS-2026-000282.', { page: 'case', id: 'SS-2026-000282', tab: 'limit' }, 'crit', 140);
  n('Kaveri Textiles RM SLA breached by 1 day.', { page: 'case', id: 'SS-2026-000312', tab: 'exceptions' }, 'crit', 65);
}
