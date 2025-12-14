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

/* === CONFIGURAÇÕES === */
const MAP_SIZE = 2400;
const rooms = {};

io.on('connection', (socket) => {
  console.log('Conectado: ' + socket.id);

  socket.on('createRoom', (playerName) => {
    try {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        rooms[roomId] = initRoom();
        rooms[roomId].players[socket.id] = createPlayer(playerName, 'warrior');
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    } catch (e) { console.error(e); }
  });

  socket.on('joinRoom', (data) => {
    try {
        const room = rooms[data.code];
        if (room) {
            const role = Object.keys(room.players).length === 0 ? 'warrior' : 'mage';
            room.players[socket.id] = createPlayer(data.name, role);
            socket.join(data.code);
            socket.emit('joinedRoom', data.code);
        } else {
            socket.emit('error', 'Sala não encontrada');
        }
    } catch (e) { console.error(e); }
  });

  socket.on('move', (data) => {
    const r = rooms[data.roomId];
    if (r && r.players[socket.id]) {
        const p = r.players[socket.id];
        if (!p.dead) {
            // Validação de Colisão antes de mover
            let newX = data.x;
            let newY = data.y;
            
            // Checa colisão com paredes
            let colidiu = false;
            for(const b of r.buildings) {
                if(Math.hypot(b.x - newX, b.y - newY) < 40) colidiu = true;
            }

            if(!colidiu) {
                p.x = newX; p.y = newY;
            }
            
            p.state = data.state; p.facing = data.facing; p.angle = data.angle;
        }
    }
  });

  socket.on('attack', (data) => {
    const r = rooms[data.roomId];
    if (!r) return;
    const p = r.players[socket.id];
    if (!p || p.dead) return;

    const range = p.role === 'warrior' ? 160 : 450;
    const dmg = p.dmg;

    // 1. DANO EM INIMIGOS
    r.enemies.forEach(e => {
        if (e.dead) return;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        
        // Verifica cone de visão (Mira)
        const angleToEnemy = Math.atan2(e.y - p.y, e.x - p.x);
        let angleDiff = Math.abs(data.angle - angleToEnemy);
        if (angleDiff > Math.PI) angleDiff = (2 * Math.PI) - angleDiff;
        
        // Guerreiro precisa mirar perto, Mago tem auto-aim mais tolerante
        const tolerance = p.role === 'warrior' ? 1.2 : 0.5;

        if (dist < range && angleDiff < tolerance) {
            e.hp -= dmg;
            // Knockback
            e.x += Math.cos(angleToEnemy) * 30; e.y += Math.sin(angleToEnemy) * 30;
            io.to(data.roomId).emit('damage', { x: e.x, y: e.y, val: Math.floor(dmg), crit: false });

            if (e.hp <= 0) {
                e.dead = true; e.respawn = 300;
                r.xpOrbs.push({ x: e.x, y: e.y, val: 25 + (r.difficulty*5) });
            }
        }
    });

    // 2. COLETA (ÁRVORES/PEDRAS)
    r.resources.forEach((res, i) => {
        if(Math.hypot(res.x - p.x, res.y - p.y) < 90) {
            let harvestDmg = 10;
            // Bonus de ferramenta (simulado)
            if(res.type === 'tree') harvestDmg = 15; // Machado
            if(res.type === 'rock') harvestDmg = 15; // Picareta
            
            res.hp -= harvestDmg;
            io.to(data.roomId).emit('shake', res.id);
            
            if(res.hp <= 0) {
                if(res.type === 'tree') p.wood += 5;
                if(res.type === 'rock') p.stone += 3;
                r.resources.splice(i, 1);
            }
        }
    });
  });

  socket.on('build', (data) => {
      const r = rooms[data.roomId];
      const p = r.players[socket.id];
      if(p && p.wood >= 20) {
          p.wood -= 20;
          r.buildings.push({ x: p.x, y: p.y, hp: 200, maxHp: 200 });
      }
  });

  socket.on('levelup', (data) => {
      const p = rooms[data.roomId].players[socket.id];
      if(data.choice === 'dmg') p.dmg *= 1.2;
      if(data.choice === 'hp') { p.maxHp += 50; p.hp = p.maxHp; }
      if(data.choice === 'spd') p.speed *= 1.1;
      rooms[data.roomId].difficulty += 0.2;
  });

  socket.on('respawn', (roomId) => {
      const p = rooms[roomId].players[socket.id];
      p.dead = false; p.hp = p.maxHp; p.x = 1200; p.y = 1200;
  });

  socket.on('disconnect', () => { /* Limpeza padrão */ });
});

/* === LÓGICA DO MUNDO === */
function initRoom() {
    return {
        players: {}, enemies: [], buildings: [], xpOrbs: [], difficulty: 1,
        resources: generateRes()
    };
}

function createPlayer(name, role) {
    return {
        name: name || "Heroi", role: role,
        x: 1200, y: 1200, hp: 100, maxHp: 100,
        dmg: role === 'warrior' ? 25 : 15,
        speed: 1, xp: 0, level: 1, nextLevel: 200, // XP mais difícil
        wood: 0, stone: 0,
        pet: { active: true, dmg: 5, range: 300, cooldown: 0 },
        dead: false
    };
}

function generateRes() {
    let arr = [];
    for(let i=0; i<40; i++) arr.push({id:'t'+i, x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, type:'tree', hp:50, maxHp:50});
    for(let i=0; i<20; i++) arr.push({id:'r'+i, x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, type:'rock', hp:80, maxHp:80});
    return arr;
}

// LOOP PRINCIPAL (30 FPS)
setInterval(() => {
  for(const id in rooms) {
      const r = rooms[id];
      if(!r) continue;

      // Spawn Inimigos
      if(r.enemies.length < 8 + r.difficulty) {
          r.enemies.push({
              x: Math.random()*MAP_SIZE, y: Math.random()*MAP_SIZE,
              hp: 50 * r.difficulty, maxHp: 50 * r.difficulty,
              speed: 3 + Math.random(), dead: false, respawn: 0
          });
      }

      // Lógica Inimigos
      r.enemies.forEach(e => {
          if(e.dead) {
              if(e.respawn > 0) e.respawn--;
              else { e.dead = false; e.hp = e.maxHp; e.x = Math.random()*MAP_SIZE; e.y = Math.random()*MAP_SIZE; }
              return;
          }

          let target = null, minDist = 9999;
          for(const pid in r.players) {
              const p = r.players[pid];
              if(!p.dead) {
                  const d = Math.hypot(p.x - e.x, p.y - e.y);
                  if(d < minDist) { minDist = d; target = p; }
              }
          }

          if(target && minDist < 800) {
              const ang = Math.atan2(target.y - e.y, target.x - e.x);
              
              // Colisão Inimigo x Parede
              let block = false;
              r.buildings.forEach(b => { if(Math.hypot(b.x-e.x, b.y-e.y)<40) { block=true; b.hp-=0.2; if(b.hp<=0) b.dead=true; } });
              r.buildings = r.buildings.filter(b => !b.dead);

              if(!block && minDist > 30) {
                  e.x += Math.cos(ang) * e.speed; e.y += Math.sin(ang) * e.speed;
              }
              if(minDist < 35) { target.hp -= 0.5; if(target.hp<=0) target.dead=true; }
          }
      });

      // Lógica PETS (Auto-Attack)
      for(const pid in r.players) {
          const p = r.players[pid];
          if(p.dead) continue;

          // Pet atira
          if(p.pet.cooldown <= 0) {
              // Busca inimigo pro pet
              let tPet = null;
              for(const e of r.enemies) {
                  if(!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < p.pet.range) { tPet = e; break; }
              }
              if(tPet) {
                  tPet.hp -= p.pet.dmg;
                  io.to(id).emit('petShot', { x: p.x, y: p.y, tx: tPet.x, ty: tPet.y });
                  if(tPet.hp <= 0) { tPet.dead = true; tPet.respawn = 300; r.xpOrbs.push({x:tPet.x, y:tPet.y, val:20}); }
                  p.pet.cooldown = 30; // 1 tiro por segundo
              }
          } else {
              p.pet.cooldown--;
          }

          // Coleta XP
          r.xpOrbs = r.xpOrbs.filter(o => {
              if(Math.hypot(p.x - o.x, p.y - o.y) < 50) {
                  p.xp += o.val;
                  if(p.xp >= p.nextLevel) {
                      p.xp = 0; p.level++; p.nextLevel *= 1.4;
                      io.to(pid).emit('levelUp');
                  }
                  return false;
              }
              return true;
          });
      }

      io.to(id).emit('update', { players: r.players, enemies: r.enemies, resources: r.resources, buildings: r.buildings, orbs: r.xpOrbs });
  }
}, 33);

server.listen(process.env.PORT || 3000, () => console.log('Server ON'));
