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

io.on('connection', (socket) => {
  console.log('Player conectado: ' + socket.id);

  socket.on('createRoom', (playerName) => {
    try {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        console.log('Criando sala ' + roomId);

        rooms[roomId] = { 
            players: {}, enemies: [], resources: generateResources(), 
            buildings: [], difficulty: 1, xpOrbs: []
        };
        
        rooms[roomId].players[socket.id] = createPlayer(playerName, 'warrior');
        spawnEnemies(roomId);
        
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    } catch (e) {
        console.error('Erro createRoom: ' + e);
    }
  });

  socket.on('joinRoom', (data) => {
    try {
        const room = rooms[data.code];
        if (room) {
            const role = Object.keys(room.players).length === 0 ? 'warrior' : 'mage';
            room.players[socket.id] = createPlayer(data.name, role);
            socket.join(data.code);
            socket.emit('joinedRoom', data.code);
        }
    } catch (e) {
        console.error('Erro joinRoom: ' + e);
    }
  });

  socket.on('move', (data) => {
    const room = rooms[data.roomId];
    if (room && room.players[socket.id]) {
        const p = room.players[socket.id];
        if (!p.dead) {
            p.x = data.x; p.y = data.y;
            p.state = data.state; p.facing = data.facing; p.aimAngle = data.angle;
        }
    }
  });

  socket.on('attack', (data) => {
    const room = rooms[data.roomId];
    if (!room || !room.players[socket.id]) return;
    const p = room.players[socket.id];
    if (p.dead) return;

    const range = p.role === 'warrior' ? 150 : 450;
    const dmg = p.dmg;

    // Ataque Inimigos
    room.enemies.forEach(e => {
        if (e.dead) return;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        if (dist < range) { 
            e.hp -= dmg;
            const angle = Math.atan2(e.y - p.y, e.x - p.x);
            e.x += Math.cos(angle) * 25; e.y += Math.sin(angle) * 25;
            
            io.to(data.roomId).emit('damageEffect', { x: e.x, y: e.y, dmg: Math.floor(dmg) });
            
            if (e.hp <= 0) {
                e.dead = true; e.respawnTimer = 200;
                room.xpOrbs.push({ x: e.x, y: e.y, val: 20 });
            }
        }
    });

    // Coleta Recursos
    room.resources.forEach((res, idx) => {
        if (Math.hypot(res.x - p.x, res.y - p.y) < 100) {
            res.hp -= dmg;
            if (res.hp <= 0) {
                if(res.type === 'tree') p.inv.wood += 5;
                if(res.type === 'rock') p.inv.stone += 3;
                room.resources.splice(idx, 1);
            }
        }
    });
  });

  socket.on('build', (data) => {
      const room = rooms[data.roomId];
      if (room && room.players[socket.id]) {
          const p = room.players[socket.id];
          if(p.inv.wood >= 10) {
              p.inv.wood -= 10;
              room.buildings.push({ x: p.x, y: p.y, hp: 150, maxHp: 150, type: 'wall' });
          }
      }
  });

  socket.on('levelUpChoice', (data) => {
      const room = rooms[data.roomId];
      if (room && room.players[socket.id]) {
          const p = room.players[socket.id];
          if(data.choice === 'dmg') p.dmg *= 1.25;
          if(data.choice === 'hp') { p.maxHp += 50; p.hp = p.maxHp; }
          if(data.choice === 'spd') p.speedMult *= 1.1;
          
          // Dificuldade progressiva
          room.difficulty += 0.1;
      }
  });

  socket.on('respawn', (roomId) => {
      const room = rooms[roomId];
      if(room && room.players[socket.id]) {
          const p = room.players[socket.id];
          p.dead = false; p.hp = p.maxHp; p.x = 1200; p.y = 1200;
      }
  });

  socket.on('disconnect', () => {
      for (const r in rooms) {
          if (rooms[r].players[socket.id]) delete rooms[r].players[socket.id];
          if (Object.keys(rooms[r].players).length === 0) delete rooms[r];
      }
  });
});

function createPlayer(name, role) {
    return {
        name: name || "Heroi", role: role,
        x: 1200, y: 1200, hp: 100, maxHp: 100,
        dmg: role === 'warrior' ? 20 : 12,
        speedMult: 1, xp: 0, level: 1, nextLevel: 100,
        inv: { wood: 0, stone: 0 },
        facing: 0, dead: false
    };
}

function generateResources() {
    const res = [];
    for(let i=0; i<30; i++) res.push({ id: 't'+i, x: Math.random()*2400, y: Math.random()*2400, type: 'tree', hp: 30, maxHp: 30 });
    for(let i=0; i<15; i++) res.push({ id: 'r'+i, x: Math.random()*2400, y: Math.random()*2400, type: 'rock', hp: 50, maxHp: 50 });
    return res;
}

function spawnEnemies(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    room.enemies = [];
    const count = 5 + Math.floor(room.difficulty * 2);
    for (let i = 0; i < count; i++) {
        room.enemies.push({
            id: i, x: Math.random()*2400, y: Math.random()*2400,
            hp: 40 * room.difficulty, maxHp: 40 * room.difficulty,
            speed: 2 + Math.random(), dead: false, respawnTimer: 0
        });
    }
}

// GAME LOOP
setInterval(() => {
  try {
      for (const rId in rooms) {
        const room = rooms[rId];
        if (!room || Object.keys(room.players).length === 0) continue;

        // Inimigos
        room.enemies.forEach(e => {
            if (e.dead) {
                e.respawnTimer--;
                if (e.respawnTimer <= 0) {
                    e.dead = false; e.hp = e.maxHp;
                    e.x = Math.random()*2400; e.y = Math.random()*2400;
                }
                return;
            }

            let target = null;
            let minDist = 9999;
            for(const pid in room.players) {
                const p = room.players[pid];
                if(!p.dead) {
                    const d = Math.hypot(p.x - e.x, p.y - e.y);
                    if(d < minDist) { minDist = d; target = p; }
                }
            }

            if (target && minDist < 800) {
                const angle = Math.atan2(target.y - e.y, target.x - e.x);
                let blocked = false;
                
                // Colisão Parede
                for(const b of room.buildings) {
                    if(Math.hypot(b.x - e.x, b.y - e.y) < 35) {
                         blocked = true; b.hp -= 0.5; if(b.hp<=0) b.dead = true;
                    }
                }
                room.buildings = room.buildings.filter(b => !b.dead);

                if(!blocked && minDist > 25) {
                    e.x += Math.cos(angle) * e.speed; e.y += Math.sin(angle) * e.speed;
                }
                if(minDist < 30) { target.hp -= 0.5; if(target.hp <= 0) target.dead = true; }
            }
        });

        // XP Orbs
        for(const pid in room.players) {
            const p = room.players[pid];
            if(p.dead) continue;
            room.xpOrbs = room.xpOrbs.filter(orb => {
                if(Math.hypot(p.x - orb.x, p.y - orb.y) < 40) {
                    p.xp += orb.val;
                    if(p.xp >= p.nextLevel) {
                        p.xp = 0; p.level++; p.nextLevel = Math.floor(p.nextLevel * 1.5);
                        io.to(pid).emit('levelUp');
                    }
                    return false;
                }
                return true;
            });
        }

        io.to(rId).emit('updateWorld', { 
            players: room.players, enemies: room.enemies, 
            resources: room.resources, buildings: room.buildings, xpOrbs: room.xpOrbs 
        });
      }
  } catch (err) {
      console.error('Erro Loop: ' + err);
  }
}, 33);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log('Server rodando na porta ' + PORT); });
