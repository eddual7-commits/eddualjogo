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

/* === ESTADO DO JOGO === */
const rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Recursos do Mapa
function generateResources() {
    let res = [];
    for(let i=0; i<40; i++) {
        res.push({
            id: 'tree_'+i, x: Math.random()*2400, y: Math.random()*2400,
            type: 'tree', hp: 30, maxHp: 30
        });
    }
    for(let i=0; i<20; i++) {
        res.push({
            id: 'rock_'+i, x: Math.random()*2400, y: Math.random()*2400,
            type: 'rock', hp: 50, maxHp: 50
        });
    }
    return res;
}

// Inimigos com Dificuldade Progressiva
function spawnEnemies(roomId) {
    const room = rooms[roomId];
    const count = 6 + Math.floor(room.difficulty * 2); // Mais inimigos conforme dificuldade
    
    room.enemies = [];
    for (let i = 0; i < count; i++) {
        room.enemies.push({
            id: i,
            x: 1000 + Math.random() * 400,
            y: 1000 + Math.random() * 400,
            hp: 40 * room.difficulty, 
            maxHp: 40 * room.difficulty,
            dmg: 5 * room.difficulty,
            speed: 2 + (Math.random()),
            dead: false, respawnTimer: 0
        });
    }
}

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  socket.on('createRoom', (playerName) => {
    const roomId = generateRoomId();
    rooms[roomId] = { 
        players: {}, enemies: [], resources: generateResources(), buildings: [],
        difficulty: 1, xpOrbs: []
    };
    
    rooms[roomId].players[socket.id] = createPlayer(playerName, 'warrior');
    spawnEnemies(roomId);
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
  });

  socket.on('joinRoom', (data) => {
    const { code, name } = data;
    if (rooms[code]) {
      const role = Object.keys(rooms[code].players).length === 0 ? 'warrior' : 'mage';
      rooms[code].players[socket.id] = createPlayer(name, role);
      socket.join(code);
      socket.emit('joinedRoom', code);
    }
  });

  socket.on('move', (data) => {
    const { roomId, x, y, state, facing, angle } = data;
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      const p = room.players[socket.id];
      if (p.dead) return;
      p.x = x; p.y = y; p.state = state; p.facing = facing; p.aimAngle = angle;
    }
  });

  socket.on('attack', (data) => {
    const { roomId, angle } = data;
    const room = rooms[roomId];
    if (!room) return;
    const p = room.players[socket.id];
    if (p.dead) return;

    // Lógica de ataque baseada na classe
    const range = p.role === 'warrior' ? 140 : 400;
    const hitWidth = p.role === 'warrior' ? 1.5 : 0.5; // Arco do ataque
    
    // 1. Dano em Inimigos
    room.enemies.forEach(e => {
        if (e.dead) return;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        const angleToEnemy = Math.atan2(e.y - p.y, e.x - p.x);
        
        // Verifica se está no alcance e na mira (Cone de visão)
        let angleDiff = Math.abs(angle - angleToEnemy);
        if (angleDiff > Math.PI) angleDiff = (2 * Math.PI) - angleDiff;

        if (dist < range && angleDiff < hitWidth) {
            e.hp -= p.dmg;
            // Knockback
            e.x += Math.cos(angleToEnemy) * 20;
            e.y += Math.sin(angleToEnemy) * 20;

            if (e.hp <= 0) {
                e.dead = true;
                e.respawnTimer = 150;
                // Drop XP
                room.xpOrbs.push({ x: e.x, y: e.y, val: 10 });
            }
            io.to(roomId).emit('damageEffect', { x: e.x, y: e.y, dmg: Math.floor(p.dmg) });
        }
    });

    // 2. Coleta de Recursos
    room.resources.forEach((res, idx) => {
        const dist = Math.hypot(res.x - p.x, res.y - p.y);
        if (dist < 100) {
            res.hp -= p.dmg;
            io.to(roomId).emit('shakeRes', { id: res.id }); // Efeito visual
            if (res.hp <= 0) {
                // Drop Material
                if(res.type === 'tree') p.inv.wood += 5;
                if(res.type === 'rock') p.inv.stone += 3;
                room.resources.splice(idx, 1);
            }
        }
    });
  });

  socket.on('build', (data) => {
      const { roomId, type } = data; // type: 'wall'
      const room = rooms[roomId];
      const p = room.players[socket.id];
      
      if(type === 'wall' && p.inv.wood >= 10) {
          p.inv.wood -= 10;
          room.buildings.push({ x: p.x, y: p.y, hp: 100, maxHp: 100, type: 'wall' });
      }
  });

  socket.on('levelUpChoice', (data) => {
      const { roomId, choice } = data; // 'dmg', 'hp', 'spd'
      const p = rooms[roomId].players[socket.id];
      
      if(choice === 'dmg') p.dmg *= 1.2;
      if(choice === 'hp') { p.maxHp += 50; p.hp += 50; }
      if(choice === 'spd') p.speedMult *= 1.1;
      
      // Aumenta dificuldade da sala
      rooms[roomId].difficulty += 0.2;
  });

  socket.on('respawn', (roomId) => {
      if(rooms[roomId] && rooms[roomId].players[socket.id]) {
          const p = rooms[roomId].players[socket.id];
          p.dead = false;
          p.hp = p.maxHp;
          p.x = 1200; p.y = 1200;
      }
  });

  socket.on('disconnect', () => {
      for (const r in rooms) {
          if (rooms[r].players[socket.id]) delete rooms[r].players[socket.id];
      }
  });
});

function createPlayer(name, role) {
    return {
        name: name || "Player",
        role: role,
        x: 1200, y: 1200,
        hp: 100, maxHp: 100,
        dmg: role === 'warrior' ? 15 : 10,
        speedMult: 1,
        xp: 0, level: 1, nextLevel: 100,
        inv: { wood: 0, stone: 0 },
        facing: 0,
        dead: false
    };
}

// GAME LOOP (30 FPS)
setInterval(() => {
  for (const rId in rooms) {
    const room = rooms[rId];
    if (Object.keys(room.players).length === 0) continue;

    // Inimigos
    room.enemies.forEach(e => {
        if (e.dead) {
            e.respawnTimer--;
            if (e.respawnTimer <= 0) {
                e.dead = false; e.hp = e.maxHp;
                e.x = Math.random() * 2400; e.y = Math.random() * 2400;
            }
            return;
        }

        // Busca Player mais próximo
        let target = null, minDist = 9999;
        Object.keys(room.players).forEach(pid => {
            const p = room.players[pid];
            if(!p.dead) {
                const d = Math.hypot(p.x - e.x, p.y - e.y);
                if(d < minDist) { minDist = d; target = p; }
            }
        });

        // Move e Ataca
        if (target) {
            const angle = Math.atan2(target.y - e.y, target.x - e.x);
            
            // Colisão com Paredes (Buildings)
            let blocked = false;
            room.buildings.forEach(b => {
                if(Math.hypot(b.x - e.x, b.y - e.y) < 40) {
                    blocked = true;
                    b.hp -= 0.5; // Inimigo bate na parede
                    if(b.hp <= 0) b.dead = true;
                }
            });
            room.buildings = room.buildings.filter(b => !b.dead);

            if(!blocked && minDist > 30) {
                e.x += Math.cos(angle) * e.speed;
                e.y += Math.sin(angle) * e.speed;
            }
            
            if(minDist < 30) target.hp -= 0.5; // Dano no player
            if(target.hp <= 0) target.dead = true;
        }
    });

    // Coleta de XP (Orbes)
    Object.keys(room.players).forEach(pid => {
        const p = room.players[pid];
        if(p.dead) return;
        
        room.xpOrbs = room.xpOrbs.filter(orb => {
            if(Math.hypot(p.x - orb.x, p.y - orb.y) < 40) {
                p.xp += orb.val;
                if(p.xp >= p.nextLevel) {
                    p.xp = 0; p.level++; p.nextLevel *= 1.5;
                    io.to(pid).emit('levelUp'); // Avisa SÓ esse player
                }
                return false;
            }
            return true;
        });
    });

    io.to(rId).emit('updateWorld', { 
        players: room.players, enemies: room.enemies, 
        resources: room.resources, buildings: room.buildings,
        xpOrbs: room.xpOrbs
    });
  }
}, 33);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Rodando na porta ${PORT}`); });
