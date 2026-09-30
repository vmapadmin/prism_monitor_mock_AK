const {JSDOM}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'dist','prism-monitor.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false}); w.print=()=>{};
const errs=[]; w.addEventListener('error',e=>errs.push(e.message));
setTimeout(()=>{ try{
 const [A,ST,CASE,CRE,cr,caseStatus,exView,lk]=['A','ST','CASE','CRE','cr','caseStatus','exView','lk'].map(x=>w.eval(x));
 const run=(f)=>{try{f()}catch(e){errs.push(e.stack)}};
 // render every page
 for(const p of ['overview','work','queue','borrowers','exceptions','dp','approvals','limits','monitoring','analytics','documents','rules','audit','admin']) run(()=>A.go({page:p}));
 run(()=>A.go({page:'borrower',id:'B001'}));
 for(const c of ST.cases) for(const t of ['overview','docs','unified','arith','cam','compare','exceptions','dp','approval','limit','timeline','reports']){ w.eval('ST').route={page:'case',id:c.id,tab:t}; run(()=>w.render()); if(t==='unified') for(const s of ['stock','debtors','creditors','bank','decl','supp']){ST.route.sub=s; run(()=>w.render());} }
 console.log('statuses:', ST.cases.map(c=>c.bor.short+':'+caseStatus(c)).join(' | '));
 const c=CASE('SS-2026-000348'); let k=CRE.calculateDP(c);
 console.log('Apex initial', cr(k.grossStock), cr(k.eligibleStock), cr(k.creditors), cr(k.netStock), cr(k.stockDP), cr(k.grossRec), lk(k.overaged), lk(k.related), cr(k.eligibleRec), cr(k.recDP), cr(k.calculatedDP));
 console.log('Apex excs', c.excs.map(e=>e.id+' '+e.key+' '+e.status).join('; '));
 ST.route={page:'case',id:c.id,tab:'docs'};
 run(()=>A.editField(c.id,'debtorTotal')); run(()=>A.saveField(c.id,'debtorTotal'));
 console.log('after HITL', caseStatus(c), c.fields.find(f=>f.key==='debtorTotal').validated);
 ['ARITH_STOCK','GIT','RELATED','DP_BELOW_OS'].forEach(key=>run(()=>A.acceptSys(c.excs.find(e=>e.key===key).id)));
 run(()=>A.sendAllRM(c.id)); console.log('after send', caseStatus(c));
 ST.role='rm';
 for(const key of ['OVERAGED','CRED_SHORT']){ const e=c.excs.find(x=>x.key===key); ST.route={page:'case',id:c.id,tab:'exceptions'}; ST.ui.ex=e.id; run(()=>w.render()); run(()=>A.rmAttach(e.id)); run(()=>A.rmSubmit(e.id)); }
 console.log('after RM', caseStatus(c), c.excs.find(x=>x.key==='OVERAGED').rm.claim);
 ST.role='analyst';
 for(const key of ['OVERAGED','CRED_SHORT']){ const e=c.excs.find(x=>x.key===key); ST.ui.ex=e.id; run(()=>w.render()); if(key==='CRED_SHORT'){ w.document.querySelector('input[name=dec][value="Accept"]').checked=true;} run(()=>A.decide(e.id)); }
 k=CRE.calculateDP(c);
 console.log('after decide', caseStatus(c), 'overaged',lk(k.overaged),'elig rec',cr(k.eligibleRec),'recDP',cr(k.recDP),'DP',cr(k.calculatedDP),'rec',cr(k.recommended),'change',cr(k.change),'shortfall',lk(k.shortfall));
 ST.route={page:'case',id:c.id,tab:'dp'}; run(()=>w.render()); run(()=>A.toggleSim()); run(()=>A.simSet('realise',50));
 console.log('sim text:', w.document.querySelector('.sim-out p')?.textContent);
 run(()=>A.submitDP(c.id)); console.log('after submit', caseStatus(c));
 ST.role='checker'; ST.route.tab='approval'; run(()=>w.render()); run(()=>A.approve(c.id,'Approved')); console.log('after approve', caseStatus(c));
 ST.role='ops'; ST.route.tab='limit'; run(()=>w.render()); w.document.getElementById('cbs-sim').value='SUCCESS'; run(()=>A.cbsResult(c.id,'SUCCESS'));
 console.log('final', caseStatus(c), c.limit.ref);
 run(()=>A.lineage(c.id,'rec')); run(()=>A.why('limit:'+c.id)); run(()=>A.report(c.id,'dpsheet'));
 ST.route={page:'case',id:c.id,tab:'timeline'}; run(()=>w.render());
 console.log('milestones', w.document.querySelectorAll('.chron li.done').length);
 // Zenith & Nova
 const z=CASE('SS-2026-000356'); console.log('Zenith', z.excs.map(e=>e.key).join(','), 'arith diff', lk(CRE.arithmeticChecks(z).find(a=>a.id==='AR-STK-TOT').diff), 'impact', lk(exView(z,z.excs[0]).impact));
 const n=CASE('SS-2026-000351'); console.log('Nova', caseStatus(n), n.excs.map(e=>e.key).join(','));
 // upload
 run(()=>A.upload('B012')); run(()=>A.fileChosen({name:'x.pdf'})); run(()=>A.process('SS-2026-000371'));
 setTimeout(()=>{ console.log('Bluewave', caseStatus(CASE('SS-2026-000371')), CASE('SS-2026-000371').excs.map(e=>e.key).join(','));
  console.log('ERRORS', errs.length, errs.slice(0,5).join('\n')); },5000);
 }catch(e){console.log('FATAL',e.stack)} },500);
