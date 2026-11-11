(() => {
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const scoreEl = $('score'), clockEl = $('clock'), overlay = $('overlay'), playBtn = $('playBtn');
  const statusEl = $('statusText'), toast = $('toast'), goalFlash = $('goalFlash'), pauseBadge = $('pauseBadge');
  const W=130,H=78,pitch={l:5,r:125,t:4,b:74,goalTop:31,goalBot:47};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const rand=(a,b)=>a+Math.random()*(b-a), norm=(x,y)=>{const n=Math.hypot(x,y)||1;return{x:x/n,y:y/n}};
  const keys=new Set(),touch={x:0,y:0};
  const state={started:false,paused:false,over:false,time:120,goals:[0,0],last:0,shotCharge:0,charging:false,sound:true,toastTimer:0,flashTimer:0,skillCooldown:0};
  let scale=1,ox=0,oy=0,dpr=1,players=[],ball={x:65,y:39,vx:0,vy:0,r:.82,owner:null,lastTouch:0},user;
  const colors=[{shirt:'#c9f16a',shade:'#6d9d35',shorts:'#142a28',sock:'#d8f39a',skin:'#bd8061',hair:'#33251f',trim:'#f2f5df'},{shirt:'#f36f59',shade:'#a63d38',shorts:'#202c2d',sock:'#ffc2a8',skin:'#98654c',hair:'#201d1c',trim:'#fff0df'}];
  const roles=['keeper','anchor','wing','wing','striker'];
  const formations=[[{x:10,y:39},{x:33,y:39},{x:48,y:18},{x:49,y:60},{x:63,y:39}],[{x:120,y:39},{x:97,y:39},{x:82,y:18},{x:81,y:60},{x:67,y:39}]];
  function makePlayer(team,index){const f=formations[team][index];return{team,index,role:roles[index],x:f.x,y:f.y,vx:0,vy:0,fx:team===0?1:-1,fy:0,r:index===0?1.35:1.13,speed:index===0?11.2:9.2,stamina:1,decision:rand(.2,1.3),kickCd:0,tackleCd:0,anim:rand(0,6),skill:0,number:team===0?[1,4,7,11,9][index]:[1,5,8,10,9][index],name:team===0?['MARTIN','REYES','PARK','COLE','YOU'][index]:['KOVAC','HAYES','SILVA','WARD','BELL'][index]};}
  function resetMatch(){players=[];for(let t=0;t<2;t++)for(let i=0;i<5;i++)players.push(makePlayer(t,i));user=players.find(p=>p.team===0&&p.index===4);ball={x:65,y:39,vx:0,vy:0,r:.82,owner:null,lastTouch:0};state.time=120;state.goals=[0,0];state.started=true;state.paused=false;state.over=false;state.skillCooldown=0;updateScore();overlay.classList.add('hidden');pauseBadge.classList.remove('show');statusEl.textContent='MATCH IN PROGRESS';notice('MAKE THE FIRST MOVE');}
  function updateScore(){scoreEl.textContent=`${state.goals[0]} — ${state.goals[1]}`;}
  function notice(text){toast.textContent=text;toast.classList.add('show');state.toastTimer=1.7;}
  function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);const w=r.width,h=r.height;scale=Math.min((w-24)/W,(h-18)/H);ox=(w-W*scale)/2;oy=(h-H*scale)/2;}
  window.addEventListener('resize',resize);resize();
  function field(){const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);ctx.fillStyle='#153525';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
    ctx.fillStyle='#1b3828';ctx.fillRect(1,1,W-2,H-2);
    for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#1a3527':'#203d2c';ctx.fillRect(2,2+i*9,W-4,9);}
    ctx.fillStyle='#0a1714';ctx.fillRect(pitch.l-1,pitch.t-1,pitch.r-pitch.l+2,pitch.b-pitch.t+2);
    const grass=ctx.createLinearGradient(0,pitch.t,0,pitch.b);grass.addColorStop(0,'#427e4c');grass.addColorStop(.52,'#347447');grass.addColorStop(1,'#286640');ctx.fillStyle=grass;ctx.fillRect(pitch.l,pitch.t,pitch.r-pitch.l,pitch.b-pitch.t);
    for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#ffffff06':'#092e1710';ctx.fillRect(pitch.l+i*12,pitch.t,12,pitch.b-pitch.t);}
    ctx.strokeStyle='#e7f5d119';ctx.lineWidth=.11;for(let y=pitch.t+2;y<pitch.b;y+=2){ctx.beginPath();ctx.moveTo(pitch.l,y);ctx.lineTo(pitch.r,y);ctx.stroke();}
    ctx.strokeStyle='#e7f2ddc7';ctx.lineWidth=.18;ctx.strokeRect(pitch.l,pitch.t,pitch.r-pitch.l,pitch.b-pitch.t);ctx.beginPath();ctx.moveTo(65,pitch.t);ctx.lineTo(65,pitch.b);ctx.stroke();ctx.beginPath();ctx.arc(65,39,9.2,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(65,39,.32,0,Math.PI*2);ctx.fillStyle='#eff3e1';ctx.fill();
    ctx.strokeRect(5,20,17,38);ctx.strokeRect(108,20,17,38);ctx.strokeRect(5,28,6,22);ctx.strokeRect(119,28,6,22);ctx.beginPath();ctx.arc(18,39,9.2,-.92,.92);ctx.stroke();ctx.beginPath();ctx.arc(112,39,9.2,Math.PI-.92,Math.PI+.92);ctx.stroke();ctx.beginPath();ctx.arc(15,39,.32,0,Math.PI*2);ctx.arc(115,39,.32,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#091714';ctx.fillRect(.3,30.5,4.7,17);ctx.fillRect(125,30.5,4.7,17);ctx.strokeStyle='#e9eee1';ctx.lineWidth=.22;ctx.strokeRect(.7,31,4.2,16);ctx.strokeRect(125.1,31,4.2,16);ctx.strokeStyle='#ffffff24';ctx.lineWidth=.13;for(let y=32;y<47;y+=2){ctx.beginPath();ctx.moveTo(.8,y);ctx.lineTo(4.8,y);ctx.moveTo(125.2,y);ctx.lineTo(129.2,y);ctx.stroke();}
    for(const x of [3,65,127])for(const y of [2.4,75.6]){ctx.fillStyle='#e4f4ad';ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(x,y,.42,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}ctx.restore();}
  function screen(x,y){return{x:ox+x*scale,y:oy+y*scale};}
  function drawPlayer(p){const s=screen(p.x,p.y),r=p.r*scale*1.55;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.atan2(p.fy,p.fx));const moving=Math.hypot(p.vx,p.vy)>.6,phase=p.anim;
    ctx.fillStyle='#06110d66';ctx.beginPath();ctx.ellipse(1.1*r,.72*r,1.14*r,.59*r,0,0,Math.PI*2);ctx.fill();
    for(let side=-1;side<=1;side+=2){const swing=moving?Math.sin(phase+side*1.6)*.34:side*.12;ctx.lineCap='round';ctx.strokeStyle='#121b1c';ctx.lineWidth=r*.32;ctx.beginPath();ctx.moveTo(-.1*r,side*.26*r);ctx.lineTo(-.28*r+swing*r,side*.43*r);ctx.lineTo(-.56*r+swing*r,side*.45*r);ctx.stroke();ctx.strokeStyle=colors[p.team].sock;ctx.lineWidth=r*.16;ctx.beginPath();ctx.moveTo(-.28*r+swing*r,side*.43*r);ctx.lineTo(-.48*r+swing*r,side*.44*r);ctx.stroke();ctx.fillStyle='#101718';ctx.beginPath();ctx.ellipse(-.62*r+swing*r,side*.45*r,.21*r,.105*r,0,0,Math.PI*2);ctx.fill();}
    for(let side=-1;side<=1;side+=2){let swing=moving?Math.sin(phase+side*1.6)*.22:side*.05;ctx.strokeStyle=colors[p.team].skin;ctx.lineWidth=r*.19;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(.02*r,side*.42*r);ctx.lineTo(-.16*r+swing*r,side*.72*r);ctx.stroke();ctx.fillStyle=colors[p.team].shirt;ctx.beginPath();ctx.ellipse(.03*r,side*.44*r,.22*r,.15*r,side*.3,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=colors[p.team].shade;ctx.beginPath();ctx.ellipse(.06*r,0,.57*r,.47*r,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors[p.team].shirt;ctx.beginPath();ctx.ellipse(.12*r,-.025*r,.48*r,.40*r,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=colors[p.team].trim+'a8';ctx.lineWidth=.045*r;ctx.beginPath();ctx.moveTo(-.24*r,0);ctx.lineTo(.38*r,0);ctx.stroke();ctx.fillStyle=colors[p.team].trim;ctx.beginPath();ctx.moveTo(.36*r,-.11*r);ctx.lineTo(.48*r,0);ctx.lineTo(.36*r,.11*r);ctx.fill();ctx.fillStyle=p.team===0?'#29432b':'#6d302c';ctx.font=`bold ${.25*r}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.number),.04*r,0);
    ctx.fillStyle=colors[p.team].skin;ctx.beginPath();ctx.ellipse(.49*r,0,.16*r,.17*r,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(.67*r,0,.3*r,.265*r,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors[p.team].hair;ctx.beginPath();ctx.ellipse(.63*r,0,.27*r,.27*r,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#f6eee0';ctx.beginPath();ctx.ellipse(.87*r,-.095*r,.045*r,.035*r,0,0,Math.PI*2);ctx.ellipse(.87*r,.095*r,.045*r,.035*r,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#202323';ctx.beginPath();ctx.arc(.89*r,-.095*r,.018*r,0,Math.PI*2);ctx.arc(.89*r,.095*r,.018*r,0,Math.PI*2);ctx.fill();ctx.restore();
    if(p===user){ctx.strokeStyle='#eaff9b';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.x,s.y,r*1.35,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#eaff9b';ctx.beginPath();ctx.moveTo(s.x,s.y-r*2.15);ctx.lineTo(s.x-r*.22,s.y-r*1.82);ctx.lineTo(s.x+r*.22,s.y-r*1.82);ctx.fill();}
    if(p===ball.owner){ctx.strokeStyle=p.team===0?'#dafb78':'#ffa18d';ctx.lineWidth=1.2;ctx.globalAlpha=.8;ctx.beginPath();ctx.ellipse(s.x,s.y+r*1.08,r*1.2,r*.46,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}}
  function drawBall(){let s=screen(ball.x,ball.y),r=Math.max(3,ball.r*scale);ctx.fillStyle='#07110d55';ctx.beginPath();ctx.ellipse(s.x+r*.3,s.y+r*.72,r*.95,r*.45,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f2f0e5';ctx.beginPath();ctx.arc(s.x,s.y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#1d2823';ctx.lineWidth=Math.max(.6,r*.08);ctx.beginPath();ctx.arc(s.x,s.y,r*.6,.2,2.4);ctx.stroke();ctx.fillStyle='#27342e';ctx.beginPath();ctx.arc(s.x-r*.18,s.y-r*.1,r*.19,0,Math.PI*2);ctx.arc(s.x+r*.29,s.y+r*.13,r*.16,0,Math.PI*2);ctx.fill();}
  function render(){field();[...players].sort((a,b)=>a.y-b.y).forEach(drawPlayer);drawBall();if(state.charging&&state.started){const s=screen(user.x,user.y);ctx.fillStyle='#07110db8';ctx.fillRect(s.x-27,s.y-27,54,4);ctx.fillStyle='#d5f575';ctx.fillRect(s.x-27,s.y-27,54*clamp(state.shotCharge/1.2,0,1),4);}}
  function attack(team){return team===0?1:-1;}
  function nearestOpponent(p){let best=null,d=1e9;for(const q of players){if(q.team!==p.team&&q.role!=='keeper'){const n=dist(p,q);if(n<d){best=q;d=n;}}}return best;}
  function holder(team){return players.find(p=>p.team===team&&ball.owner===p)||null;}
  function teammateTarget(p,dt){const dir=attack(p.team),own=holder(p.team),enemy=holder(1-p.team),bx=ball.x,by=ball.y,base=formations[p.team][p.index];let tx=base.x,ty=base.y;
    if(p.role==='keeper'){tx=p.team===0?10:120;ty=clamp(by,34,44);if((p.team===0&&bx<25)||(p.team===1&&bx>105)){tx=p.team===0?12:118;ty=clamp(by,30,48);}return{x:tx,y:ty};}
    const advance=(bx-65)*dir;
    // Distinct tactical lanes; a single designated presser means no ball-chasing swarm.
    if(!own){
      const ourGoalX=p.team===0?5:125, towardGoal=Math.abs(bx-ourGoalX);
      if(enemy){
        const nonKeep=players.filter(q=>q.team===p.team&&q.role!=='keeper');
        const press=nonKeep.reduce((a,b)=>dist(b,ball)<dist(a,ball)?b:a,nonKeep[0]);
        if(p===press){tx=bx-dir*1.4;ty=by;}
        else if(p.role==='anchor'){tx=base.x+dir*clamp(advance*.14,-7,8);ty=clamp(by+(base.y-39)*.3,25,53);}
        else {tx=base.x+dir*clamp(advance*.12,-5,9);ty=base.y+(by-39)*.10;}
      } else {
        // hold shape but offer a close, staggered option to the human
        const supportX=user.x+dir*(p.role==='anchor'?8:12);
        if(p.role==='anchor'){tx=clamp(supportX,22,94);ty=base.y+(by-39)*.13;}
        else {tx=base.x+dir*clamp(advance*.12,-3,8);ty=base.y+(by-39)*.1;}
      }
    } else {
      const d=dir*(bx-p.x);
      if(p.role==='anchor'){tx=clamp(bx-dir*10,20,110);ty=clamp(by+(base.y-39)*.22,26,52);}
      else if(p.role==='wing'){tx=clamp(bx+dir*(d>2?14:7),18,112);ty=base.y<39?13:65;}
      else {tx=clamp(bx+dir*(d>0?16:9),20,115);ty=clamp(39+(base.y-39)*.34,26,52);}
      // Each forward runner stays in a separate channel and moves toward goal at a different tempo.
      if(p.role==='wing')tx+=dir*2.5;
      if(p.role==='striker')ty=clamp(39+(ball.y-39)*.48,30,48);
    }
    const margin=p.role==='keeper'?5:8;return{x:clamp(tx,margin,130-margin),y:clamp(ty,8,70)};
  }
  function kick(p,kind,power=0.65){if(!p)return;let dx,dy,speed;if(kind==='pass'){
      const options=players.filter(q=>q.team===p.team&&q!==p&&q.role!=='keeper');let target=options.sort((a,b)=>{
        const score=q=>dist(p,q)+Math.max(0,-attack(p.team)*(q.x-p.x))*1.15+Math.abs(q.y-p.y)*.18;return score(a)-score(b);})[0];
      if(target){dx=target.x-p.x;dy=target.y-p.y;const n=norm(dx,dy);dx=n.x;dy=n.y;}else{dx=attack(p.team);dy=0;}speed=23;notice('PLAYED INTO SPACE');
    } else {
      const gx=p.team===0?125:5, goalY=39;let aim=norm(gx-p.x,goalY-p.y);
      // Face direction matters, but shots are gently assisted into the goal corridor.
      const facing=norm(p.fx,p.fy), blend=clamp((facing.x*attack(p.team)+.28)/1.2,.15,.78);
      dx=facing.x*(1-blend)+aim.x*blend;dy=facing.y*(1-blend)+aim.y*blend;
      const n=norm(dx,dy);dx=n.x;dy=n.y;speed=27+power*24;notice(power>.78?'POWER STRIKE!':'SHOT!');
    }
    ball.owner=null;ball.x=p.x+p.fx*1.05;ball.y=p.y+p.fy*1.05;ball.vx=dx*speed;ball.vy=dy*speed;p.kickCd=.5;ball.lastTouch=p.team;
  }
  function shootStart(){if(!state.started||state.paused||state.over)return;state.charging=true;state.shotCharge=0;}
  function shootEnd(){if(!state.charging)return;state.charging=false;if(ball.owner===user)kick(user,'shot',clamp(state.shotCharge/1.05,.24,1));else if(!ball.owner&&dist(user,ball)<2.2){user.fx=user.fx||1;ball.vx=user.fx*15;ball.vy=user.fy*15;ball.lastTouch=0;notice('QUICK TOUCH');}}
  function pass(){if(state.started&&!state.paused&&!state.over&&ball.owner===user)kick(user,'pass');}
  function skill(){if(!state.started||state.paused||state.over||state.skillCooldown>0)return;const d=norm(user.fx,user.fy);let foe=nearestOpponent(user);if(foe&&dist(user,foe)<7){const side=norm(-(foe.y-user.y),foe.x-user.x);user.fx=norm(d.x*.25+side.x*.75,d.y*.25+side.y*.75).x;user.fy=norm(d.x*.25+side.x*.75,d.y*.25+side.y*.75).y;}
    user.skill=.72;state.skillCooldown=4.2;if(ball.owner===user){ball.x=user.x+user.fx*1.5;ball.y=user.y+user.fy*1.5;ball.vx=user.fx*5.5;ball.vy=user.fy*5.5;ball.owner=null;user.skillBall=.36;}
    notice(foe&&dist(user,foe)<8?'NICE FEINT!':'BURST OF PACE');statusEl.textContent='SKILL RECHARGING';}
  function switchPlayer(index){if(!state.started||state.paused||state.over)return;const squad=players.filter(p=>p.team===0);const next=Number.isInteger(index)?squad.find(p=>p.index===index):squad[(squad.indexOf(user)+1)%squad.length];if(next&&next!==user){user=next;notice(`CONTROLLING ${user.name}`);}}
  function steal(){if(!state.started||state.paused||state.over)return;if(ball.owner===user){notice('YOU HAVE THE BALL');return;}if(user.tackleCd>0)return;
    const carrier=ball.owner&&ball.owner.team!==user.team?ball.owner:null,target=carrier||ball,gap=dist(user,target);
    if(gap>3.6){notice('GET CLOSER TO STEAL');return;}
    user.tackleCd=1.05;const direction=norm(target.x-user.x,target.y-user.y);user.fx=direction.x;user.fy=direction.y;user.vx+=direction.x*5;user.vy+=direction.y*5;
    if(carrier){ball.owner=user;ball.lastTouch=user.team;ball.x=user.x+user.fx*1.02;ball.y=user.y+user.fy*1.02;ball.vx=ball.vy=0;notice('CLEAN STEAL!');}
    else if(!ball.owner){ball.owner=user;ball.lastTouch=user.team;ball.vx=ball.vy=0;notice('BALL WON!');}
    else notice('PRESS THE OPPONENT');
  }
  function inputVector(){let x=0,y=0;if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;if(keys.has('KeyD')||keys.has('ArrowRight'))x++;if(keys.has('KeyW')||keys.has('ArrowUp'))y--;if(keys.has('KeyS')||keys.has('ArrowDown'))y++;x+=touch.x;y+=touch.y;return norm(x,y);}
  function playerUpdate(p,dt){p.anim+=dt*(Math.hypot(p.vx,p.vy)*.8+1.5);p.kickCd=Math.max(0,p.kickCd-dt);p.tackleCd=Math.max(0,p.tackleCd-dt);p.skill=Math.max(0,p.skill-dt);
    let desired={x:0,y:0},max=p.speed;
    if(p===user){const v=inputVector();desired=v;if(v.x||v.y){p.fx=v.x;p.fy=v.y;}const sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');if(sprint&&p.stamina>.05){max*=1.53;p.stamina=Math.max(0,p.stamina-dt*.24);}else p.stamina=Math.min(1,p.stamina+dt*.11);if(p.skill>0)max*=1.62;if(state.charging)max*=.72;
    }else{
      const target=teammateTarget(p,dt),v=norm(target.x-p.x,target.y-p.y);let distance=Math.hypot(target.x-p.x,target.y-p.y);desired=distance<.7?{x:0,y:0}:v;
      const isPressing=!holder(p.team)&&p.role!=='keeper'&&Math.hypot(p.x-ball.x,p.y-ball.y)<4;
      max=p.speed*(isPressing?1.12:1);if(ball.owner===p){p.fx=attack(p.team);p.fy=clamp((39-p.y)*.02,-.25,.25);}
      // AI decision cadence is intentional: no twitching and no pack of players on the ball.
      p.decision-=dt;if(p.decision<=0){p.decision=rand(.28,.65);if(ball.owner===p&&p.kickCd<=0){const goalX=p.team===0?125:5;const gap=Math.abs(goalX-p.x);const goalie=players.find(q=>q.team!==p.team&&q.role==='keeper');if(gap<42&&Math.abs(p.y-39)<19&&Math.random()<.54){p.fx=attack(p.team);p.fy=(39-p.y)*.018;kick(p,'shot',rand(.25,.68));}else if(Math.random()<.48){kick(p,'pass');}else {p.fx=attack(p.team);p.fy=(39-p.y)*.02;}}
      }
    }
    const acceleration=(p===user?45:33)*dt;const targetVx=desired.x*max,targetVy=desired.y*max;p.vx+=clamp(targetVx-p.vx,-acceleration,acceleration);p.vy+=clamp(targetVy-p.vy,-acceleration,acceleration);
    if(!desired.x&&!desired.y){p.vx*=Math.pow(.001,dt);p.vy*=Math.pow(.001,dt);}
    p.x=clamp(p.x+p.vx*dt,6.8,123.2);p.y=clamp(p.y+p.vy*dt,7.5,70.5);
    if(Math.hypot(p.vx,p.vy)>.6){p.fx=p.vx/Math.hypot(p.vx,p.vy);p.fy=p.vy/Math.hypot(p.vx,p.vy);}
    if(p.role==='keeper'){const gx=p.team===0?10:120;p.x+=clamp(gx-p.x,-2*dt,2*dt);p.y=clamp(p.y,28,50);}
  }
  function physics(dt){for(const p of players)playerUpdate(p,dt);
    // Body separation keeps players from clipping or collapsing into one stack.
    for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){const a=players[i],b=players[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=(a.r+b.r)*.72;if(d>0&&d<min){const push=(min-d)*.5,nx=dx/d,ny=dy/d;a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;}}
    if(ball.owner){const p=ball.owner;ball.x=p.x+p.fx*1.02;ball.y=p.y+p.fy*1.02;ball.vx=p.vx*.48;ball.vy=p.vy*.48;
      // Opponents tackle only in close range; a skill burst protects the carrier briefly.
      const challengers=players.filter(q=>q.team!==p.team&&q.role!=='keeper'&&dist(q,p)<1.8);if(challengers.length&&!(p===user&&p.skill>.25)){const challenger=challengers.reduce((a,b)=>dist(a,p)<dist(b,p)?a:b);if(p===user||Math.random()<dt*1.25){ball.owner=challenger;ball.lastTouch=challenger.team;challenger.fx=-p.fx;challenger.fy=-p.fy;notice(p===user?'TACKLED — WIN IT BACK!':'TURNOVER');}}
    }else{
      ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;const drag=Math.pow(.986,dt*60);ball.vx*=drag;ball.vy*=drag;
      if(ball.y<5.4||ball.y>72.6){ball.y=clamp(ball.y,5.4,72.6);ball.vy*=-.72;}
      if(ball.x<5.05&&!(ball.y>30.8&&ball.y<47.2)){ball.x=5.05;ball.vx=Math.abs(ball.vx)*.72;}
      if(ball.x>124.95&&!(ball.y>30.8&&ball.y<47.2)){ball.x=124.95;ball.vx=-Math.abs(ball.vx)*.72;}
      if(ball.x<4.2&&ball.y>31&&ball.y<47){score(1);return;}if(ball.x>125.8&&ball.y>31&&ball.y<47){score(0);return;}
      // Closest player claims a loose ball; goalkeepers get first reach in their box.
      const reachable=players.filter(p=>Math.hypot(p.x-ball.x,p.y-ball.y)<(p.role==='keeper'?2.4:1.55)).sort((a,b)=>dist(a,ball)-dist(b,ball));
      if(reachable.length){const p=reachable[0];ball.owner=p;ball.vx=ball.vy=0;p.fx=p.team===0?1:-1;p.fy=0;if(p===user)notice('BALL AT YOUR FEET');}
    }
  }
  function score(team){state.goals[team]++;updateScore();state.flashTimer=1.5;goalFlash.classList.add('show');notice(team===0?'NORTHSIDE — GOAL!':'RIVALS SCORE');setTimeout(()=>goalFlash.classList.remove('show'),1350);ball={x:65,y:39,vx:0,vy:0,r:.82,owner:null,lastTouch:team};players.forEach((p,i)=>{const f=formations[p.team][p.index];p.x=f.x;p.y=f.y;p.vx=p.vy=0;p.fx=p.team===0?1:-1;p.fy=0;});}
  function finish(){state.over=true;state.started=false;statusEl.textContent='FULL TIME';overlay.classList.remove('hidden');const h=state.goals[0],a=state.goals[1];document.querySelector('.eyebrow').innerHTML='<span class="live-dot"></span> FULL TIME';document.querySelector('.intro-card h1').innerHTML=h>a?'A night<br><em>to remember.</em>':h<a?'The work<br><em>continues.</em>':'All square.<br><em>Respect.</em>';document.querySelector('.intro-card p').innerHTML=`Northside ${h} — ${a} Rivals<br>${h>a?'What a performance. The crowd is yours.':'Every match is another chance to shine.'}`;playBtn.innerHTML='PLAY AGAIN <span>→</span>';}
  function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,(now-(state.last||now))/1000);state.last=now;if(state.started&&!state.paused&&!state.over){state.time=Math.max(0,state.time-dt);if(state.charging)state.shotCharge=Math.min(1.25,state.shotCharge+dt);if(state.skillCooldown>0)state.skillCooldown=Math.max(0,state.skillCooldown-dt);if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)toast.classList.remove('show');}clockEl.textContent=`${String(Math.floor((120-state.time)/60)).padStart(2,'0')}:${String(Math.floor((120-state.time)%60)).padStart(2,'0')}`;if(state.skillCooldown===0&&statusEl.textContent==='SKILL RECHARGING')statusEl.textContent='MATCH IN PROGRESS';if(state.time===0)finish();else physics(dt);}render();}
  requestAnimationFrame(frame);
  playBtn.addEventListener('click',()=>{document.querySelector('.eyebrow').innerHTML='<span class="live-dot"></span> THE LIGHTS ARE ON';resetMatch();});
  window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();if(e.repeat)return;keys.add(e.code);if(e.code==='Space')shootStart();if(e.code==='KeyQ')pass();if(e.code==='KeyE')skill();if(e.code==='KeyF')steal();if(e.code==='Tab')switchPlayer();if(/^Digit[1-5]$/.test(e.code))switchPlayer(Number(e.code.slice(-1))-1);if(e.code==='KeyP'&&state.started){state.paused=!state.paused;pauseBadge.classList.toggle('show',state.paused);statusEl.textContent=state.paused?'MATCH PAUSED':'MATCH IN PROGRESS';}});
  window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')shootEnd();});
  window.addEventListener('blur',()=>{keys.clear();if(state.charging)shootEnd();});
  $('soundBtn').addEventListener('click',e=>{state.sound=!state.sound;e.currentTarget.textContent=state.sound?'♫':'♪';e.currentTarget.style.color=state.sound?'#d9e3dd':'#738078';});
  const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};let heldDirs=new Set();
  function refreshTouch(){let x=0,y=0;for(const d of heldDirs){x+=dirs[d][0];y+=dirs[d][1];}const n=norm(x,y);touch.x=heldDirs.size?n.x:0;touch.y=heldDirs.size?n.y:0;}
  document.querySelectorAll('[data-dir]').forEach(btn=>{const d=btn.dataset.dir;btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);heldDirs.add(d);refreshTouch();});for(const ev of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(ev,()=>{heldDirs.delete(d);refreshTouch();});});
  document.querySelectorAll('[data-action]').forEach(btn=>{const act=btn.dataset.action;btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);if(act==='shoot')shootStart();if(act==='pass')pass();if(act==='skill')skill();if(act==='steal')steal();if(act==='switch')switchPlayer();});if(act==='shoot')for(const ev of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(ev,shootEnd);});
})();
