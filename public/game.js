(() => {
  const socket = io();
  const $ = id => document.getElementById(id);
  const lobby=$('lobby'), arenaPanel=$('arenaPanel'), form=$('joinForm'), canvas=$('game'), ctx=canvas.getContext('2d');
  let myId=null, roomCode='', state=null, joined=false, toastTimer=null, keys={}, lastStateAt=0, effects=[], particles=[], cameraX=0;
  const mapNames={forest:'Rừng Cổ Đại',lava:'Hỏa Ngục',ice:'Băng Phong'};
  const input={left:false,right:false,jump:false,attack:false,guard:false,dash:false,skill:false,special:false};
  function notify(message){const t=$('toast');t.textContent=message;t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),2800)}
  function randomCode(){return 'KIEM'+Math.random().toString(36).slice(2,6).toUpperCase()}
  $('randomCode').addEventListener('click',()=>{$('roomCode').value=randomCode()});
  form.addEventListener('submit',e=>{e.preventDefault();const name=$('playerName').value.trim()||'Kiem Si';const code=$('roomCode').value.trim().toUpperCase();if(!code)return notify('Hãy nhập hoặc tạo mã phòng.');socket.emit('joinRoom',{name,code,mapKey:$('mapSelect').value});});
  $('startGame').addEventListener('click',()=>socket.emit('startGame'));
  $('overlayStart').addEventListener('click',()=>socket.emit('startGame'));
  $('copyRoom').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(roomCode);notify('Đã sao chép mã phòng: '+roomCode)}catch{notify('Mã phòng của bạn: '+roomCode)}});
  $('leaveRoom').addEventListener('click',()=>{location.reload()});
  $('mapSelect').addEventListener('change',()=>socket.emit('chooseMap',$('mapSelect').value));
  socket.on('connect',()=>{$('matchStatus').textContent='Đã kết nối máy chủ';});
  socket.on('connect_error',()=>notify('Không kết nối được máy chủ. Hãy tải lại trang.'));
  socket.on('notice',notify);
  socket.on('joined',data=>{myId=data.id;roomCode=data.code;joined=true;lobby.classList.add('hidden');arenaPanel.classList.remove('hidden');$('roomLabel').textContent=roomCode;$('roomCodeBig').textContent=roomCode;$('arenaTitle').textContent=mapNames[data.mapKey]||'Đấu trường';});
  socket.on('state',s=>{state=s;lastStateAt=performance.now();if(!joined)return;$('arenaTitle').textContent=mapNames[s.mapKey]||'Đấu trường';const me=s.players.find(p=>p.id===myId);const host=s.players[0]?.id===myId;$('startGame').classList.toggle('hidden',!host||s.started);$('overlayStart').classList.toggle('hidden',!host||s.started);$('overlay').classList.toggle('hidden',s.started);if(me&&!me.alive&&s.started) $('matchStatus').textContent='Bạn đã bị hạ — chờ kết thúc trận';else if(s.winner) $('matchStatus').textContent='Người chiến thắng: '+s.winner;else $('matchStatus').textContent=`${s.players.length}/4 kiếm sĩ · ${s.started?'Đang chiến đấu':'Đang chờ bắt đầu'}`;renderPlayerList(s);});
  socket.on('clash',e=>{const col=e.kind==='block'?'#9deaff':e.kind==='skill'?'#d5a6ff':'#ffe5a1';effects.push({x:e.x,y:e.y,life:20,max:20,color:col,kind:e.kind});for(let i=0;i<12;i++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*7,vy:(Math.random()-.6)*7,life:18,color:col});});
  function renderPlayerList(s){const el=$('playerList');el.innerHTML='';for(const p of s.players){const card=document.createElement('div');card.className='player-card';const hp=Math.max(0,p.hp);card.innerHTML=`<div class="player-name" style="color:${p.color}">${escapeHtml(p.name)} ${p.id===myId?'(Bạn)':''}</div><div class="health"><span style="width:${hp}%;${p.alive?'':'background:#596273'}"></span></div><div class="player-meta"><span>${p.alive?hp+' HP':'Bị hạ'}</span><span>Hạ gục: ${p.score}</span></div>`;el.appendChild(card)}}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  const keyMap={a:'left',arrowleft:'left',d:'right',arrowright:'right',w:'jump',arrowup:'jump',' ':'jump',j:'attack',s:'guard',shift:'dash',k:'skill',l:'special'};
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(keyMap[k]){e.preventDefault();keys[keyMap[k]]=true;sendInput()} });
  window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(keyMap[k]){keys[keyMap[k]]=false;sendInput()} });
  window.addEventListener('blur',()=>{keys={};sendInput()});
  function sendInput(){if(!joined)return;for(const k of Object.keys(input))input[k]=!!keys[k];socket.emit('input',input)}
  function rect(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h)}
  function drawBackground(s){const m=s.mapKey;let g=ctx.createLinearGradient(0,0,0,600);if(m==='lava'){g.addColorStop(0,'#27152a');g.addColorStop(.62,'#6a2e35');g.addColorStop(1,'#f07838')}else if(m==='ice'){g.addColorStop(0,'#102a48');g.addColorStop(.7,'#4f8aaf');g.addColorStop(1,'#c4e7ee')}else{g.addColorStop(0,'#102b35');g.addColorStop(.72,'#1b5549');g.addColorStop(1,'#7b8b58')}rect(0,0,1200,600,g);
    // stars, moon and distant scenery
    ctx.globalAlpha=.35;for(let i=0;i<38;i++){const x=((i*173-cameraX*.12)%1400+1400)%1400-100,y=30+(i*71)%200;rect(x,y,2,2,'#e9f6ff')}ctx.globalAlpha=1;
    if(m==='lava'){ctx.fillStyle='#321b2b';for(let i=0;i<10;i++){let x=((i*190-cameraX*.22)%1500+1500)%1500-120;ctx.beginPath();ctx.moveTo(x,410);ctx.lineTo(x+65,170+(i%3)*30);ctx.lineTo(x+150,410);ctx.fill()}for(let i=0;i<9;i++){let x=((i*230-cameraX*.45)%1600+1600)%1600-100;rect(x,490,90,8,'#ff9a47');rect(x+22,480,35,5,'#ffd27b')}}
    else if(m==='ice'){ctx.fillStyle='#d7f2ff';for(let i=0;i<8;i++){let x=((i*220-cameraX*.25)%1500+1500)%1500-100;ctx.beginPath();ctx.moveTo(x,430);ctx.lineTo(x+80,170+(i%3)*35);ctx.lineTo(x+180,430);ctx.fill()}ctx.globalAlpha=.6;for(let i=0;i<12;i++)rect((i*131-cameraX*.35)%1300,460,65,3,'#d8f8ff');ctx.globalAlpha=1}
    else{for(let i=0;i<9;i++){let x=((i*180-cameraX*.25)%1500+1500)%1500-100;rect(x+25,260,18,190,'#163f3c');ctx.fillStyle='#1a5144';ctx.beginPath();ctx.moveTo(x-35,300);ctx.lineTo(x+35,190+(i%3)*22);ctx.lineTo(x+105,300);ctx.fill();ctx.beginPath();ctx.moveTo(x-25,350);ctx.lineTo(x+35,245);ctx.lineTo(x+95,350);ctx.fill()}}
  }
  function drawPlatform(p,s){let fill=s.mapKey==='lava'?'#493342':s.mapKey==='ice'?'#b8e3f0':'#344f47';let edge=s.mapKey==='lava'?'#ff9852':s.mapKey==='ice'?'#e4fbff':'#92b96b';rect(p.x-cameraX,p.y,p.w,p.h,fill);rect(p.x-cameraX,p.y,p.w,5,edge);for(let x=p.x+10;x<p.x+p.w-5;x+=34){rect(x-cameraX,p.y+12,18,3,'#ffffff18')}}
  function drawPlayer(p){const x=p.x-cameraX,y=p.y; if(!p.alive){ctx.globalAlpha=.25;rect(x+3,y+20,30,10,'#aab2c1');ctx.globalAlpha=1;return}
    // shadow
    ctx.globalAlpha=.28;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x+17,y+58,22,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    if(p.invuln>0&&Math.floor(performance.now()/60)%2===0)ctx.globalAlpha=.45;
    // legs and body
    rect(x+7,y+39,8,17,'#202b3a');rect(x+20,y+39,8,17,'#202b3a');rect(x+5,y+53,13,5,'#111a25');rect(x+18,y+53,13,5,'#111a25');rect(x+5,y+18,25,25,p.color);rect(x+3,y+24,29,6,'#e5eaf0');rect(x+8,y+2,19,19,'#e9c39c');rect(x+6,y,23,8,'#202b3a');rect(x+9,y+10,17,3,'#28384b');rect(p.facing===1?21:9,y+9,4,3,'#ffffff');
    // scarf
    ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(x+8,y+22);ctx.lineTo(x+(p.facing===1?-15:49),y+28);ctx.lineTo(x+8,y+31);ctx.fill();
    // sword angle / trail
    const attacking=p.attacking;ctx.save();ctx.translate(x+17,y+29);ctx.scale(p.facing,1);ctx.rotate(attacking?-.85:-.28);rect(5,-2,32,4,'#dfe9f6');rect(8,-1,24,2,'#ffffff');rect(1,-5,4,10,'#e4ad56');rect(-2,-4,3,8,'#6d4a35');ctx.restore();
    if(attacking){ctx.save();ctx.globalAlpha=.78;ctx.strokeStyle=p.combo>=3?'#d4a0ff':'#9af4ff';ctx.lineWidth=p.combo>=3?7:4;ctx.beginPath();const sx=x+17,sy=y+28;ctx.arc(sx+p.facing*16,sy,p.combo>=3?53:39,p.facing===1?-1.25:Math.PI-.15,p.facing===1?.55:Math.PI+1.2,p.facing===-1);ctx.stroke();ctx.globalAlpha=.25;ctx.lineWidth=13;ctx.stroke();ctx.restore()}
    if(p.guarding){ctx.strokeStyle='#a3efff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+17,y+29,28,-1.4,1.4);ctx.stroke()}
    ctx.globalAlpha=1;ctx.font='bold 12px Inter';ctx.textAlign='center';ctx.fillStyle='#06101a';ctx.fillText(p.name,x+18,y-10+1);ctx.fillStyle=p.color;ctx.fillText(p.name,x+17,y-10);ctx.textAlign='left';
  }
  function drawEffects(){for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life--;ctx.globalAlpha=Math.max(0,e.life/e.max);ctx.strokeStyle=e.color;ctx.lineWidth=e.kind==='skill'?5:3;ctx.beginPath();ctx.arc(e.x-cameraX,e.y,Math.max(3,(e.max-e.life)*2),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;if(e.life<=0)effects.splice(i,1)}for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life--;p.x+=p.vx;p.y+=p.vy;p.vy+=.15;ctx.globalAlpha=Math.max(0,p.life/18);rect(p.x-cameraX,p.y,3,3,p.color);ctx.globalAlpha=1;if(p.life<=0)particles.splice(i,1)}}
  function drawHUD(s){const alive=s.players.filter(p=>p.alive).length;ctx.fillStyle='#07111dcc';ctx.fillRect(16,14,210,48);ctx.fillStyle='#f4c36b';ctx.font='bold 12px Inter';ctx.fillText('KIẾM VỰC  /  '+mapNames[s.mapKey].toUpperCase(),28,33);ctx.fillStyle='#e9f1fb';ctx.font='11px Inter';ctx.fillText('Còn sống: '+alive+' / 4',28,50);}
  function render(){requestAnimationFrame(render);ctx.clearRect(0,0,1200,600);if(!state){drawBackground({mapKey:'forest'});ctx.fillStyle='#f4f7fb';ctx.font='bold 22px Inter';ctx.fillText('Kiếm Vực — đang chờ kết nối...',38,70);return}const me=state.players.find(p=>p.id===myId);const target=me?Math.max(0,Math.min(state.map.width-1200,me.x-600)):0;cameraX+=(target-cameraX)*.12;drawBackground(state);for(const plat of state.map.platforms)drawPlatform(plat,state);if(state.mapKey==='lava'){for(let x=0;x<1200;x+=70){ctx.fillStyle='#ff9b45';ctx.globalAlpha=.4+Math.sin(performance.now()/180+x)*.2;ctx.fillRect(x,558,42,4)}ctx.globalAlpha=1}if(state.mapKey==='ice'){ctx.globalAlpha=.5;for(let i=0;i<9;i++){let x=((i*177-cameraX*.8)%1300+1300)%1300;ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(x,520);ctx.lineTo(x+14,545);ctx.lineTo(x+2,558);ctx.stroke()}ctx.globalAlpha=1}for(const p of state.players)drawPlayer(p);drawEffects();drawHUD(state);if(!state.started&&state.winner){ctx.fillStyle='#07111dcc';ctx.fillRect(0,0,1200,600);ctx.fillStyle='#f4c36b';ctx.font='bold 42px Barlow Condensed';ctx.textAlign='center';ctx.fillText(state.winner+' CHIẾN THẮNG!',600,285);ctx.textAlign='left'}}
  render();
})();
