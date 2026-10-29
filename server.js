const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, game: 'Kiem Vuc' }));

const MAPS = {
  forest: { name: 'Rung Co Dai', width: 1800, platforms: [{x:0,y:520,w:1800,h:80},{x:250,y:410,w:250,h:18},{x:700,y:330,w:230,h:18},{x:1150,y:410,w:250,h:18}] },
  lava: { name: 'Hoa Nguc', width: 1800, platforms: [{x:0,y:520,w:470,h:80},{x:620,y:520,w:560,h:80},{x:1330,y:520,w:470,h:80},{x:330,y:400,w:200,h:18},{x:820,y:350,w:180,h:18},{x:1270,y:400,w:200,h:18}] },
  ice: { name: 'Bang Phong', width: 1800, platforms: [{x:0,y:520,w:1800,h:80},{x:180,y:420,w:210,h:18},{x:520,y:360,w:210,h:18},{x:1080,y:360,w:210,h:18},{x:1410,y:420,w:210,h:18}] }
};
const rooms = new Map();
const colors = ['#4dd0e1','#ff6b6b','#ffd166','#b197fc'];
function makeRoom(code) { return { code, players: {}, mapKey: 'forest', started: false, winner: null, createdAt: Date.now() }; }
function publicState(room) {
  return { code: room.code, mapKey: room.mapKey, map: MAPS[room.mapKey], started: room.started, winner: room.winner,
    players: Object.values(room.players).map(p => ({ id:p.id, name:p.name, x:p.x, y:p.y, vx:p.vx, vy:p.vy, facing:p.facing, hp:p.hp, alive:p.alive, color:p.color, attacking:p.attackTimer>0, guarding:p.guarding, dashTimer:p.dashTimer, invuln:p.invuln, score:p.score })) };
}
function broadcast(room) { io.to(room.code).emit('state', publicState(room)); }
function resetRound(room) {
  room.started = true; room.winner = null;
  const starts = [120, 570, 1120, 1580];
  Object.values(room.players).forEach((p,i) => Object.assign(p, { x: starts[i] || 100, y: 300, vx:0, vy:0, hp:100, alive:true, facing:i<2?1:-1, attackTimer:0, attackCooldown:0, attackHit:false, guarding:false, dashTimer:0, invuln:0, combo:0, comboTimer:0 }));
}
function addPlayer(socket, room, name) {
  const count = Object.keys(room.players).length;
  room.players[socket.id] = { id:socket.id, name:String(name||'Kiem Si').slice(0,16), x:120+count*400, y:300, vx:0, vy:0, facing:count<2?1:-1, hp:100, alive:true, color:colors[count%colors.length], input:{}, attackTimer:0, attackCooldown:0, attackHit:false, guarding:false, dashTimer:0, invuln:0, combo:0, comboTimer:0, score:0 };
  socket.join(room.code);
}
io.on('connection', socket => {
  socket.on('joinRoom', ({ code, name, mapKey } = {}) => {
    code = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
    if (!code) return socket.emit('notice', 'Hay nhap ma phong.');
    let room = rooms.get(code);
    if (!room) { room = makeRoom(code); rooms.set(code, room); }
    if (Object.keys(room.players).length >= 4) return socket.emit('notice', 'Phong da du 4 nguoi. Hay thu ma phong khac.');
    if (room.started && Object.values(room.players).some(p=>p.alive)) return socket.emit('notice', 'Tran dau dang dien ra. Hay vao phong khac hoac doi tran moi.');
    if (mapKey && MAPS[mapKey] && Object.keys(room.players).length===0) room.mapKey=mapKey;
    addPlayer(socket, room, name);
    socket.data.roomCode = code;
    socket.emit('joined', { id:socket.id, code, mapKey:room.mapKey });
    io.to(code).emit('notice', `${room.players[socket.id].name} da vao phong (${Object.keys(room.players).length}/4).`);
    if (Object.keys(room.players).length >= 2 && !room.started) io.to(code).emit('notice', 'Da co the bat dau! Chu phong bam Bat dau tran.');
    broadcast(room);
  });
  socket.on('startGame', () => {
    const room = rooms.get(socket.data.roomCode); if (!room) return;
    if (Object.keys(room.players)[0] !== socket.id) return socket.emit('notice','Chi nguoi vao phong dau tien moi bat dau tran.');
    if (Object.keys(room.players).length < 2) return socket.emit('notice','Can it nhat 2 nguoi de bat dau.');
    resetRound(room); io.to(room.code).emit('notice','Tran dau bat dau!'); broadcast(room);
  });
  socket.on('chooseMap', mapKey => {
    const room=rooms.get(socket.data.roomCode); if (!room || !MAPS[mapKey] || room.started) return;
    if (Object.keys(room.players)[0] !== socket.id) return socket.emit('notice','Chi chu phong duoc chon ban do.');
    room.mapKey=mapKey; broadcast(room);
  });
  socket.on('input', input => {
    const room=rooms.get(socket.data.roomCode); const p=room?.players[socket.id]; if (!p || !room.started || !p.alive) return;
    const allowed=['left','right','jump','attack','guard','dash','skill','special'];
    p.input={}; for (const k of allowed) p.input[k]=!!input?.[k];
  });
  socket.on('disconnect', () => {
    const code=socket.data.roomCode; const room=rooms.get(code); if (!room) return;
    delete room.players[socket.id];
    io.to(code).emit('notice','Mot kiem si da roi phong.');
    if (Object.keys(room.players).length===0) rooms.delete(code);
    else { if (room.started) checkWinner(room); broadcast(room); }
  });
});
function overlap(a,b) { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
function checkWinner(room) {
  if (!room.started) return;
  const alive=Object.values(room.players).filter(p=>p.alive);
  if (alive.length<=1) { room.started=false; room.winner=alive[0]?.name || 'Khong co nguoi chien thang'; io.to(room.code).emit('notice', `Ket thuc tran! ${room.winner} chien thang!`); }
}
setInterval(() => {
  for (const room of rooms.values()) {
    if (!room.started) continue;
    const map=MAPS[room.mapKey];
    for (const p of Object.values(room.players)) {
      if (!p.alive) continue;
      const i=p.input || {};
      if (p.attackCooldown>0) p.attackCooldown--; if (p.attackTimer>0) p.attackTimer--; if (p.invuln>0) p.invuln--; if (p.dashTimer>0) p.dashTimer--; if (p.comboTimer>0) p.comboTimer--; else p.combo=0;
      p.guarding=i.guard && p.attackTimer===0;
      if (i.left) { p.vx=Math.max(p.vx-0.9,-5.2); p.facing=-1; }
      if (i.right) { p.vx=Math.min(p.vx+0.9,5.2); p.facing=1; }
      if (!i.left && !i.right) p.vx*=0.78;
      if (i.jump && p.onGround) { p.vy=-12.5; p.onGround=false; }
      if (i.dash && p.dashTimer===0) { p.vx=p.facing*12; p.invuln=9; p.dashTimer=38; }
      if (i.attack && p.attackCooldown===0 && !p.guarding) {
        p.attackTimer=13; p.attackCooldown=25; p.attackHit=false; p.combo=(p.combo+1)%3; p.comboTimer=65;
      }
      if (i.skill && p.attackCooldown===0 && !p.guarding) { p.attackTimer=20; p.attackCooldown=48; p.attackHit=false; p.combo=3; p.comboTimer=70; p.vx=p.facing*7; }
      if (i.special && p.attackCooldown===0 && !p.guarding) { p.attackTimer=25; p.attackCooldown=90; p.attackHit=false; p.combo=4; p.comboTimer=80; p.vx=p.facing*9; }
      p.vy=Math.min(p.vy+0.62,14); p.x+=p.vx; p.y+=p.vy; p.onGround=false;
      const body={x:p.x,y:p.y,w:34,h:58};
      for (const plat of map.platforms) {
        if (p.vy>=0 && body.x < plat.x+plat.w && body.x+body.w > plat.x && body.y+body.h >= plat.y && body.y+body.h-p.vy <= plat.y) { p.y=plat.y-body.h; p.vy=0; p.onGround=true; }
      }
      p.x=Math.max(0,Math.min(map.width-34,p.x));
      if (p.y>760) { p.hp=0; p.alive=false; }
    }
    const players=Object.values(room.players);
    for (const a of players) {
      if (!a.alive || a.attackTimer<6 || a.attackHit) continue;
      const reach=a.combo===3?112:(a.combo===4?145:78);
      const hitbox={x:a.facing===1?a.x+28:a.x-reach+6,y:a.y+8,w:reach,h:44};
      for (const b of players) {
        if (b.id===a.id || !b.alive || b.invuln>0) continue;
        if (overlap(hitbox,{x:b.x,y:b.y,w:34,h:58})) {
          a.attackHit=true;
          if (b.guarding && b.facing===-a.facing) { b.vx+=a.facing*2; io.to(room.code).emit('clash',{x:(a.x+b.x)/2,y:Math.min(a.y,b.y)+20,kind:'block'}); }
          else { const damage=a.combo===4?32:(a.combo===3?22:12); b.hp=Math.max(0,b.hp-damage); b.vx=a.facing*(a.combo>=3?9:6); b.vy=-4; io.to(room.code).emit('clash',{x:b.x+17,y:b.y+24,kind:a.combo>=3?'skill':'hit'}); if (b.hp<=0) { b.alive=false; a.score++; io.to(room.code).emit('notice',`${b.name} bi ha guc boi ${a.name}!`); } }
          break;
        }
      }
    }
    checkWinner(room); broadcast(room);
  }
}, 1000/30);
server.listen(PORT, () => console.log(`Kiem Vuc dang chay tai cong ${PORT}`));
