const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');

const pastaPublica = path.join(__dirname, 'public');
app.use(express.static(pastaPublica));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(pastaPublica, 'index.html'), (err) => {
      if (err) res.sendFile(path.join(__dirname, 'index.html'));
  });
});

const rooms = {};
const MAP_SIZE = 2400;

// Tipos de Construção
const BUILDINGS = {
    'table': { hp: 50, cost: {wood:5, stone:0}, type: 'table' },
    'wall_wood': { hp: 100, cost: {wood:10, stone:0}, type: 'wall' },
    'wall_stone': { hp: 300, cost: {wood:0, stone:10}, type: 'wall' },
    'turret': { hp: 80, cost: {wood:20, stone:10}, type: 'turret', dmg: 5, range: 400, cd: 0 },
    'campfire': { hp: 50, cost: {wood:15, stone:5}, type: 'campfire' } // Cura quem tá perto
};

io.on('connection', (socket) => {
  console.log('Conectado: ' + socket.id);

  socket.on('createRoom', (name) => {
    try {
        const id = Math.random().toString(36).substring(2, 6).toUpperCase();
        rooms[id] = initRoom();
        rooms[id].players[socket.id] = createPlayer(name, 'warrior');
        socket.join(id);
        socket.emit('roomCreated', id);
    } catch(e) { console.error(e); }
  });

  socket.on('joinRoom', (d) => {
    try {
        const r = rooms[d.code];
        if (r) {
            const role = Object.keys(r.players).length === 0 ? 'warrior' : 'mage';
            r.players[socket.id] = createPlayer(d.name, role);
            socket.join(d.code);
            socket.emit('joinedRoom', d.code);
        }
    } catch(e) { console.error(e); }
  });

  socket.on('move', (d) => {
    const r = rooms[d.roomId];
    if (r && r.players[socket.id]) {
        const p = r.players[socket.id];
        if(!p.dead) {
            // Colisão Simples
            let nextX = d.x; let nextY = d.y;
            let col = false;
            for(const b of r.buildings) {
                if(b.type !== 'campfire' && Math.hypot(b.x - nextX, b.y - nextY) < 35) col = true;
            }
            if(!col) { p.x = nextX; p.y = nextY; }
            p.state = d.state; p.facing = d.facing; p.angle = d.angle;
        }
    }
  });

  socket.on('attack', (d) => {
    const r = rooms[d.roomId];
    if (!r) return;
    const p = r.players[socket.id];
    if (!p || p.dead) return;

    // Lógica das Cartas OP (Multishot)
    const shots = p.cards.includes('multi') ? [-0.2, 0, 0.2] : [0]; // 3 ângulos se tiver carta
    
    shots.forEach(offset => {
        const finalAngle = d.angle + offset;
        processAttack(r, p, finalAngle, d.roomId);
    });
  });

  socket.on('build', (d) => {
      const r = rooms[d.roomId];
      const p = r.players[socket.id];
      const bData = BUILDINGS[d.type];
      
      if(p && bData) {
          if(p.inv.wood >= bData.cost.wood && p.inv.stone >= bData.cost.stone) {
              p.inv.wood -= bData.cost.wood;
              p.inv.stone -= bData.cost.stone;
              r.buildings.push({ 
                  x: p.x + Math.cos(p.facing)*60, 
                  y: p.y + Math.sin(p.facing)*60, 
                  hp: bData.hp, maxHp: bData.hp, 
                  type: bData.type,
                  turretData: d.type === 'turret' ? {cd:0} : null
              });
          }
      }
  });

  socket.on('levelup', (d) => {
      const p = rooms[d.roomId].players[socket.id];
      // Cartas Apelonas
      if(d.choice === 'multi') p.cards.push('multi');
      if(d.choice === 'vamp') p.cards.push('vamp');
      if(d.choice === 'dmg') p.dmg *= 1.4;
      if(d.choice === 'hp') { p.maxHp += 100; p.hp = p.maxHp; }
      rooms[d.roomId].difficulty += 0.3; // Fica mais difícil
  });

  socket.on('respawn', (rid) => {
      const p = rooms[rid].players[socket.id];
      p.dead = false; p.hp = p.maxHp; p.x = 1200; p.y = 1200;
  });

  socket.on('disconnect', () => { /* Limpeza */ });
});

function processAttack(r, p, angle, roomId) {
    const range = p.role === 'warrior' ? 160 : 500;
    
    // Inimigos
    r.enemies.forEach(e => {
        if (e.dead) return;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        const angToE = Math.atan2(e.y - p.y, e.x - p.x);
        let diff = Math.abs(angle - angToE);
        if (diff > Math.PI) diff = (2*Math.PI) - diff;

        if (dist < range && diff < 0.6) { // Hitbox tolerante
            e.hp -= p.dmg;
            // Vampirismo
            if(p.cards.includes('vamp')) p.hp = Math.min(p.hp + 2, p.maxHp);
            
            e.x += Math.cos(angToE)*20; e.y += Math.sin(angToE)*20; // Knockback
            io.to(roomId).emit('dmg', {x:e.x, y:e.y, val:Math.floor(p.dmg)});
            
            if (e.hp <= 0) {
                e.dead = true; e.respawn = 200;
                r.xpOrbs.push({x:e.x, y:e.y, val: 30 + r.difficulty*5});
            }
        }
    });

    // Recursos
    r.resources.forEach((res, i) => {
        if(Math.hypot(res.x - p.x, res.y - p.y) < 90) {
            let dmg = 10;
            // Bonus ferramenta
            if(res.type==='tree' && p.role==='warrior') dmg=20; 
            res.hp -= dmg;
            io.to(roomId).emit('shake', res.id);
            if(res.hp <= 0) {
                if(res.type==='tree') p.inv.wood += 5;
                if(res.type==='rock') p.inv.stone += 3;
                io.to(roomId).emit('resBreak', {x:res.x, y:res.y, type:res.type});
                r.resources.splice(i, 1);
            }
        }
    });
}

function initRoom() {
    return { players:{}, enemies:[], buildings:[], xpOrbs:[], difficulty:1, resources:genRes() };
}

function createPlayer(name, role) {
    return {
        name: name || "Heroi", role: role,
        x: 1200, y: 1200, hp: 100, maxHp: 100,
        dmg: role === 'warrior' ? 30 : 18,
        xp: 0, level: 1, nextLevel: 150,
        inv: {wood:0, stone:0}, cards: [],
        dead: false
    };
}

function genRes() {
    let a = [];
    for(let i=0; i<50; i++) a.push({id:'t'+i, x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, type:'tree', hp:40, maxHp:40});
    for(let i=0; i<30; i++) a.push({id:'r'+i, x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, type:'rock', hp:60, maxHp:60});
    return a;
}

// GAME LOOP (30 FPS)
setInterval(() => {
  for(const id in rooms) {
      const r = rooms[id];
      if(!r) continue;

      // Spawn contínuo (Horda aumenta)
      if(r.enemies.length < 10 + r.difficulty*2) {
          r.enemies.push({x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, hp:60*r.difficulty, maxHp:60*r.difficulty, speed:2.5+Math.random(), dead:false});
      }

      // Lógica Inimigos
      r.enemies.forEach(e => {
          if(e.dead) { if(e.respawn>0) e.respawn--; else {e.dead=false; e.hp=e.maxHp; e.x=Math.random()*MAP_SIZE; e.y=Math.random()*MAP_SIZE;} return;}
          
          let t = null, min = 9999;
          for(const pid in r.players) {
              const p = r.players[pid];
              if(!p.dead) { const d = Math.hypot(p.x-e.x, p.y-e.y); if(d<min){min=d; t=p;} }
          }

          if(t && min < 1000) {
              const ang = Math.atan2(t.y - e.y, t.x - e.x);
              let block = false;
              // Inimigo bate nas construções
              r.buildings.forEach(b => { if(Math.hypot(b.x-e.x, b.y-e.y)<45 && b.type!=='campfire') { block=true; b.hp-=1; if(b.hp<=0)b.dead=true; }});
              r.buildings = r.buildings.filter(b=>!b.dead);

              if(!block && min > 25) { e.x+=Math.cos(ang)*e.speed; e.y+=Math.sin(ang)*e.speed; }
              if(min < 30) { t.hp -= 1; if(t.hp<=0) t.dead=true; }
          }
      });

      // Turrets e Campfires
      r.buildings.forEach(b => {
          if(b.type === 'campfire') {
             // Cura jogadores perto
             for(const pid in r.players) {
                 const p = r.players[pid];
                 if(Math.hypot(p.x-b.x, p.y-b.y) < 150 && p.hp < p.maxHp) p.hp += 0.5;
             }
          }
          if(b.type === 'turret') {
              if(b.turretData.cd <= 0) {
                  let te = null;
                  for(const e of r.enemies) { if(!e.dead && Math.hypot(e.x-b.x, e.y-b.y)<400) { te=e; break; } }
                  if(te) {
                      te.hp -= 10;
                      io.to(id).emit('turretShot', {sx:b.x, sy:b.y, ex:te.x, ey:te.y});
                      b.turretData.cd = 20;
                      if(te.hp<=0) { te.dead=true; te.respawn=200; r.xpOrbs.push({x:te.x, y:te.y, val:20}); }
                  }
              } else b.turretData.cd--;
          }
      });

      // XP e Level Up
      for(const pid in r.players) {
          const p = r.players[pid];
          if(p.dead) continue;
          r.xpOrbs = r.xpOrbs.filter(o => {
              if(Math.hypot(p.x-o.x, p.y-o.y) < 50) {
                  p.xp += o.val;
                  if(p.xp >= p.nextLevel) { p.xp=0; p.level++; p.nextLevel*=1.5; io.to(pid).emit('levelUp'); }
                  return false;
              }
              return true;
          });
      }

      io.to(id).emit('update', { players:r.players, enemies:r.enemies, resources:r.resources, buildings:r.buildings, orbs:r.xpOrbs });
  }
}, 33);

server.listen(process.env.PORT || 3000, () => console.log('ON'));
