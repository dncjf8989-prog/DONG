// 밸런스 시뮬레이션: 헤드리스로 게임 로직을 빠르게 돌리며 진행 지표를 기록한다.
// 사용법: node sim.js <게임 html 경로> <시뮬 분(minute)> [봇 정책 JSON]
const {chromium}=require('playwright');
const file=process.argv[2]||'file:///home/user/DONG/idle/index.html';
const minutes=+(process.argv[3]||120);
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext();
  await ctx.addInitScript(()=>{ window.setInterval=()=>0; });   // 실시간 타이머 비활성화 (tick을 직접 호출)
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(file);
  const out=await p.evaluate((minutes)=>{
    float=()=>{}; let deaths=0, timeouts=0;
    say=m=>{ if(String(m).includes('쓰러')) deaths++; if(String(m).includes('시간 초과')) timeouts++; };
    const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
    const rows=[]; let recent=[]; let gemEarnedStart=0; let pullsTotal=0;
    function bot(){
      // 전직
      const tier=jobNodes().length;
      if(tier<4 && S.lv>=JOB_LV[tier]){ const kids=Object.keys(jobKids()); S.job.push(kids[0]); }
      // 스킬/스탯 포인트
      if(skRoot()){ skList().forEach((sk,i)=>{ if(skTier()>=sk.tier){ const n=Math.min(sk.max-skLv(i),skLeft()); if(n>0) S.sk[skKey(i)]=skLv(i)+n; } }); }
      if(spLeft()>0) S.sp.atk=(S.sp.atk||0)+spLeft();
      // 메소: 능력치 (싼 순)
      for(let i=0;i<200;i++){
        const opts=STATS.filter(s=>!(s.max&&S.stat[s.k]>=s.max)).map(s=>({s,c:upCost(s)})).filter(x=>x.s.k!=='meso'||S.stat.meso<S.stat.atk/2).sort((a,b)=>a.c-b.c);
        const o=opts[0]; if(!o||S.meso<o.c) break; S.meso-=o.c; S.stat[o.s.k]++;
      }
      // 장비 메소 강화 (남는 메소의 일부)
      for(const g of GEAR){ for(let i=0;i<20;i++){ const c=gearCost(g.k); if(S.meso<c*3) break; S.meso-=c; if(Math.random()<gearRate(g.k)) S.gear[g.k]++; } }
      // 광산
      for(let i=0;i<3;i++){ const c=mineCost(); if(S.mine.lv<MINEMAX && S.meso>c*4){ if(S.mine.lv===0) S.mine.t=Date.now(); S.meso-=c; S.mine.lv++; } }
      // 광산 수령 (시뮬 시간으로 환산하기 위해 t를 조정)
      // 유물
      for(;;){ const ks=Object.keys(RELICS).filter(k=>relicLv(k)<RELICMAX&&S.rs>=relicCost(k)).sort((a,b)=>relicCost(a)-relicCost(b)); if(!ks.length) break; const k=ks[0]; S.rs-=relicCost(k); (S.relic[k]=S.relic[k]||{lv:0}).lv++; }
      // 💎 뽑기: 장비 10연 → 펫 10연 → 동료 10연 순환
      const order=['gear','pet','mate']; let guard=0;
      while(guard++<50){
        const t=order[pullsTotal%3];
        if(t==='gear'&&S.gem>=PULL10){ S.gem-=PULL10; for(let i=0;i<10;i++) pullOne(i===9?1:0); }
        else if(t==='pet'&&S.gem>=PET10){ S.gem-=PET10; for(let i=0;i<10;i++) pullPet(i===9?1:0); }
        else if(t==='mate'&&S.gem>=MATE10){ S.gem-=MATE10; for(let i=0;i<10;i++) pullMate(i===9?1:0); }
        else break;
        pullsTotal++;
      }
      // 승급/강화
      Object.values(S.items).forEach(it=>{ while(it.n>=STARUP&&it.star<STARMAX){ it.n-=STARUP; it.star++; } });
      Object.values(S.pets).forEach(o=>{ while(o.sh>=o.lv&&o.lv<PETMAX){ o.sh-=o.lv; o.lv++; } });
      Object.values(S.mates).forEach(o=>{ while(o.sh>=o.lv&&o.lv<MATEMAX){ o.sh-=o.lv; o.lv++; } });
      mergeMax(); autoAll();
      // 광산 수령
      const g=minePending(); if(g>=1){ S.gem+=g; S.mine.t=Date.now(); }
    }
    function stageLogic(minuteIdx){
      recent.push(deaths+timeouts); if(recent.length>4) recent.shift();
      const stuck=(recent[recent.length-1]-recent[0])>=4;
      if(stuck){ if(S.stage>1) S.stage--; else if(S.map>0){ S.map--; S.stage=Math.min(STAGES,(S.clear[S.map]||0)+1); } isBoss=false; S.kills=0; spawn(); recent=[deaths+timeouts]; }
      else if(recent.length>=4 && recent[3]===recent[0]){   // 4분간 사고 없으면 한 단계 위로
        const best=Math.min(STAGES,(S.clear[S.map]||0)+1);
        if(S.stage<best){ S.stage++; isBoss=false; S.kills=0; spawn(); }
        else if(S.stage>=STAGES && (S.clear[S.map]||0)>=STAGES && S.map<MAPS.length-1 && S.lv>=MAPS[S.map+1].lv){ S.map++; S.stage=1; isBoss=false; S.kills=0; spawn(); }
      }
      // 레벨 조건 맞으면 더 높은 맵 중 클리어 안 된 곳으로 (맵 최대 진행)
    }
    for(let m=1;m<=minutes;m++){
      for(let t=0;t<600;t++) tick();
      // 광산은 실시간(Date.now) 기반이라 시뮬 1분 = mine.t를 1분 당김
      if(S.mine.lv) S.mine.t-=60*1000;
      // 방치 보상 대신 10분당 💎1은 오프라인 전용이라 생략
      bot(); stageLogic(m);
      if([10,30,60,120,240,480,720,1440,2880,4320,7200,10080,20160].includes(m)) rows.push({t:m>=60?(m/60).toFixed(0)+'h':m+'m',lv:S.lv,map:S.map+1,stage:S.stage,clears:sum(S.clear),meso:Math.round(S.meso),gem:S.gem,pulls:pullsTotal,atk:Math.round(P().atk),hp:Math.round(P().hp),dps:Math.round(dpsInfo().total),deaths,timeouts,
        gearAvg:+(Object.values(S.equip).filter(Boolean).reduce((a,k)=>a+kr(k),0)/8).toFixed(1),legend:Object.keys(S.items).filter(k=>kr(k)===4).length,petsOwned:Object.keys(S.pets).length,matesOwned:Object.keys(S.mates).length});
    }
    const J=jm(),B=pb(),M=mt(),R=rv(),K=skv(),H=hold();
    rows.push({debug:{lv:S.lv,J:J.atk,Batk:B.atk,Matk:M.atk,Ratk:R.atk,Katk:K.atk,SPatk:SP('atk'),statAtk:S.stat.atk,gearW:S.gear.weapon,epW:S.equip.weapon?kindPow(S.equip.weapon):0,holdW:Math.round(H.weapon),equip:JSON.stringify(S.equip),dps:dpsInfo(),skillMul:P().skill,crit:P().crit,cdmg:P().cdmg,spd:P().spd,baseAtk:10+S.lv*3}});
    return rows;
  },minutes);
  console.log(out.map(r=>JSON.stringify(r)).join('\n'));
  console.log('errors',errs);
  await b.close();
})();
