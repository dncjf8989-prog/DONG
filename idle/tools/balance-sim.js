// 밸런스 시뮬레이션 v2: 출석/퀘스트/업적/교환소/탑/광산까지 하는 "성실한 플레이어"를 흉내낸다.
// 사용법: node sim2.js <게임 html URL> <시뮬 일수> [하루 중 접속(활동) 시간(h), 기본 24]
const {chromium}=require('playwright');
const file=process.argv[2]||'file:///home/user/DONG/idle/index.html';
const days=+(process.argv[3]||7);
const activeH=+(process.argv[4]||24);   // 하루 중 실제로 켜 둔 시간 (나머지는 오프라인으로 처리)
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext();
  await ctx.addInitScript(()=>{ window.setInterval=()=>0; });
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(file);
  const out=await p.evaluate(({days,activeH})=>{
    float=()=>{}; let deaths=0,timeouts=0; say=m=>{ if(String(m).includes('쓰러')) deaths++; if(String(m).includes('시간 초과')) timeouts++; };
    const base=Date.now(); let curMin=0; Date.now=()=>base+curMin*60000;
    const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
    let recent=[], sets={gear:0,pet:0,mate:0}, gemIn={}, lastGem=S.gem;
    const track=(k,v)=>{ gemIn[k]=(gemIn[k]||0)+v; };
    function claimAll(){
      chkDaily();
      if(!S.daily.login){ S.daily.login=true; S.gem+=30; track('login',30); }
      DQ.forEach(q=>{ if((S.daily[q.id]||0)>=q.goal&&!S.daily.claim[q.id]){ S.daily.claim[q.id]=true; S.gem+=q.gem; track('daily',q.gem); } });
      WQ.forEach(q=>{ if((S.week[q.id]||0)>=q.goal&&!S.week.claim[q.id]){ S.week.claim[q.id]=true; S.gem+=q.gem; track('weekly',q.gem); } });
      ACH.forEach(a=>{ if(a.cur()>=a.goal&&!S.ach[a.id]){ S.ach[a.id]=true; S.gem+=a.gem; track('achieve',a.gem); } });
      // 교환소
      while(S.ex.n<EXMAX && S.meso>=exPrice()*2){ S.meso-=exPrice(); S.ex.n++; S.gem++; track('exchange',1); }
    }
    function towerDaily(){
      chkDaily();
      // 입장권 3장: 1장은 도전, 나머지는 소탕(기록 5층 이상)
      let g0=S.gem; if(S.lv>=TW.unlock){
        if(S.tower.tk>=1){ towerStart(); for(let i=0;i<30000&&towerRun;i++) tick(); }
        while(S.tower.tk>=1 && S.tower.best>=5) towerSweep();
      }
      track('tower',S.gem-g0);
    }
    function bot(){
      const tier=jobNodes().length;
      if(tier<4 && S.lv>=JOB_LV[tier]){ S.job.push(Object.keys(jobKids())[0]); }
      if(skRoot()){ skList().forEach((sk,i)=>{ if(skTier()>=sk.tier){ const n=Math.min(sk.max-skLv(i),skLeft()); if(n>0) S.sk[skKey(i)]=skLv(i)+n; } }); }
      if(spLeft()>0) S.sp.atk=(S.sp.atk||0)+spLeft();
      for(let i=0;i<300;i++){
        const opts=STATS.filter(s=>!(s.max&&S.stat[s.k]>=s.max)).map(s=>({s,c:upCost(s)})).filter(x=>x.s.k!=='meso'||S.stat.meso<S.stat.atk/2).sort((a,b)=>a.c-b.c);
        const o=opts[0]; if(!o||S.meso<o.c) break; S.meso-=o.c; S.stat[o.s.k]++;
      }
      for(const g of GEAR){ for(let i=0;i<20;i++){ const c=gearCost(g.k); if(S.meso<c*3) break; S.meso-=c; chkDaily(); S.daily.enh++; S.week.enh++; if(Math.random()<gearRate(g.k)) S.gear[g.k]++; } }
      for(let i=0;i<3;i++){ const c=mineCost(); if(S.mine.lv<MINEMAX && S.meso>c*4){ if(S.mine.lv===0) S.mine.t=Date.now(); S.meso-=c; S.mine.lv++; } }
      for(;;){ const ks=Object.keys(RELICS).filter(k=>relicLv(k)<RELICMAX&&S.rs>=relicCost(k)).sort((a,b)=>relicCost(a)-relicCost(b)); if(!ks.length) break; const k=ks[0]; S.rs-=relicCost(k); (S.relic[k]=S.relic[k]||{lv:0}).lv++; }
      // 💎 뽑기: 장비→펫→동료 10연 순환 (가격 동일)
      const order=['gear','pet','mate']; let guard=0, idx=sets.gear+sets.pet+sets.mate;
      while(guard++<80){
        const t=order[idx%3]; chkDaily();
        if(t==='gear'&&S.gem>=PULL10){ S.gem-=PULL10; for(let i=0;i<10;i++) pullOne(i===9?1:0); }
        else if(t==='pet'&&S.gem>=PET10){ S.gem-=PET10; for(let i=0;i<10;i++) pullPet(i===9?1:0); }
        else if(t==='mate'&&S.gem>=MATE10){ S.gem-=MATE10; for(let i=0;i<10;i++) pullMate(i===9?1:0); }
        else break;
        S.daily.pull+=10; S.week.pull+=10; sets[t]++; idx++;
      }
      Object.values(S.items).forEach(it=>{ while(it.n>=STARUP&&it.star<STARMAX){ it.n-=STARUP; it.star++; } });
      Object.values(S.pets).forEach(o=>{ while(o.sh>=o.lv&&o.lv<PETMAX){ o.sh-=o.lv; o.lv++; } });
      Object.values(S.mates).forEach(o=>{ while(o.sh>=o.lv&&o.lv<MATEMAX){ o.sh-=o.lv; o.lv++; } });
      mergeMax(); autoAll();
      const g=minePending(); if(g>=1){ S.gem+=g; S.mine.t=Date.now(); track('mine',g); }
    }
    function stageLogic(){
      recent.push(deaths+timeouts); if(recent.length>4) recent.shift();
      const stuck=(recent[recent.length-1]-recent[0])>=4;
      if(stuck){ if(S.stage>1) S.stage--; else if(S.map>0){ S.map--; S.stage=Math.min(STAGES,(S.clear[S.map]||0)+1); } isBoss=false; S.kills=0; spawn(); recent=[deaths+timeouts]; }
      else if(recent.length>=4 && recent[3]===recent[0]){
        const best=Math.min(STAGES,(S.clear[S.map]||0)+1);
        if(S.stage<best){ S.stage++; isBoss=false; S.kills=0; spawn(); }
        else if(S.stage>=STAGES && (S.clear[S.map]||0)>=STAGES && S.map<MAPS.length-1 && S.lv>=MAPS[S.map+1].lv){ S.map++; S.stage=1; isBoss=false; S.kills=0; spawn(); }
      }
    }
    const rows=[], hourRows=[]; let prevSets=0, prevGem=0;
    for(let d=1; d<=days; d++){
      // 새 날 시작
      S.daily.d='x'; S.ex.d='x'; S.tower.d='x'; if((d-1)%7===0) S.week.d='x';
      claimAll(); towerDaily();
      const activeMin=Math.round(activeH*60);
      for(let m=1;m<=1440;m++){
        curMin=(d-1)*1440+m;
        if(m<=activeMin){
          for(let t=0;t<600;t++) tick();
          bot(); stageLogic();
          if(m%60===0) claimAll();
          if(d===1 && [30,60,120,180,240,360,480].includes(m)) hourRows.push({min:m,lv:S.lv,map:S.map+1,stage:S.stage,clears:sum(S.clear),sets10:sets.gear+sets.pet+sets.mate,gem:Math.round(S.gem),dps:Math.round(dpsInfo().total),gemIn:JSON.stringify(gemIn)});
        } else if(m===activeMin+1){
          // 오프라인: 한 번에 계산 (방치 보상 + 광산 + 💎)
          const off=1440-activeMin; S.last=Date.now()-off*60000; offline(); bot();
          curMin=(d-1)*1440+1440;
        }
      }
      claimAll();
      const tot=sets.gear+sets.pet+sets.mate;
      rows.push({day:d,lv:S.lv,map:S.map+1,stage:S.stage,clears:sum(S.clear),'tower':S.tower.best,sets10:tot,setsToday:tot-prevSets,gemNow:Math.round(S.gem),
        legend:Object.keys(S.items).filter(k=>kr(k)===4).length,pets:Object.keys(S.pets).length,mates:Object.keys(S.mates).length,dps:Math.round(dpsInfo().total),mineLv:S.mine.lv});
      prevSets=tot;
    }
    return {rows,gemIn,hourRows};
  },{days,activeH});
  console.log('-- 첫날 시간대별'); console.log(out.hourRows.map(r=>JSON.stringify(r)).join('\n')); console.log('-- 일별'); console.log(out.rows.map(r=>JSON.stringify(r)).join('\n'));
  console.log('gem sources (bot-tracked claims):',JSON.stringify(out.gemIn));
  console.log('errors',errs);
  await b.close();
})();
