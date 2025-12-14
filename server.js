const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');

// Configuração de Pastas
const pastaPublica = path.join(__dirname, 'public');
app.use(express.static(pastaPublica));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  // Tenta servir o index da pasta public, se não, serve da raiz
  res.sendFile(path.join(pastaPublica, 'index.html'), (err) => {
    if (err) res.sendFile(path.join(__dirname, 'index.html'));
  });
});

/* === ESTADO DO JOGO === */
const rooms = {};

// Função auxiliar segura
function getRoom(id) {
    return rooms[id];
}

io.on('connection', (socket) => {
  console.log('Jogador conectado:', socket.id);

  // 1. CRIAR SALA (Protegido)
  socket.on('createRoom', (playerName) => {
    try {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        console.log(`Criando sala ${roomId} para ${playerName}`);

        rooms[roomId] = { 
            players: {}, 
            enemies: [], 
            resources: generateResources(), 
            buildings: [],
            difficulty: 1, 
            xpOrbs: []
        };
        
        // Cria o Player
        rooms[roomId].players[socket.id] = createPlayer(playerName, 'warrior');
        
        // Spawna inimigos
        spawnEnemies(roomId);
        
        socket.join(roomId);
        socket.emit('roomCreated', roomId); // AVISA O CLIENTE
        console.log("Sala criada com sucesso!");
    } catch (e) {
        console.error("ERRO AO CRIAR SALA:", e);
    }
  });

  // 2. ENTRAR EM SALA
  socket.on('joinRoom', (data) => {
    try {
        const { code, name } = data;
        const room = rooms[code];
        
        if (room) {
            const role = Object.keys(room.players).length === 0 ? 'warrior' : 'mage';
            room.players[socket.id] = createPlayer(name, role);
            
            socket.join(code);
            socket.emit('joinedRoom', code);
            console.log(`${name} entrou na sala ${code}`);
        } else {
            console.log("Sala não encontrada:", code);
        }
    } catch (e) {
        console.error("ERRO AO ENTRAR:", e);
    }
  });

  // 3. MOVIMENTO
  socket.on('move', (data) => {
    const { roomId, x, y, state, facing, angle } = data;
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      const p = room.players[socket.id];
      if (p.dead) return;
      // Validação simples
      if (!isNaN(x) && !isNaN(y)) {
          p.x = x; p.y = y;
      }
      p.state = state; p.facing = facing; p.aimAngle = angle;
    }
  });

  // 4. ATAQUE
  socket.on('attack', (data) => {
    const { roomId, angle } = data;
    const room = rooms[roomId];
    if (!room || !room.players[socket.id]) return;

    const p = room.players[socket.id];
    if (p.dead) return;

    const range = p.role === 'warrior' ? 150 : 450;
    const cone = p.role === 'warrior' ? 1.5 : 0.6; 
    const dmg = p.dmg;

    // Hit em Inimigos
    room.enemies.forEach(e => {
        if (e.dead) return;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        const angleToEnemy = Math.atan2(e.y - p.y, e.x - p.x);
        
        // Verifica se está na mira
        let angleDiff = Math.abs(angle - angleToEnemy);
        if (angleDiff > Math.PI) angleDiff = (2 * Math.PI) - angleDiff;

        if (dist < range && angleDiff < cone) {
            e.hp -= dmg;
            // Knockback
            e.x += Math.cos(angleToEnemy) * 25;
            e.y += Math.sin(angleToEnemy) * 25;
            
            // Dano visual
            io.to(roomId).emit('damageEffect', { x: e.x, y: e.y, dmg: Math.floor(dmg) });

            if (e.hp <= 0) {
                e.dead = true;
                e.respawnTimer = 200;
                // Drop XP
                room.xpOrbs.push({ x: e.x, y: e.y, val: 20 });
            }
        }
    });

    // Coleta de Recursos
    room.resources.forEach((res, idx) => {
        const dist = Math.hypot(res.x - p.x, res.y - p.y);
        if (dist < 100) {
            res.hp -= dmg;
            io.to(roomId).emit('shakeRes', { id: res.id });
            if (res.hp <= 0) {
                if(res.type === 'tree') p.inv.wood += 5;
                if(res.type === 'rock') p.inv.stone += 3;
                room.resources.splice(idx, 1);
            }
        }
    });
  });

  // 5. CONSTRUÇÃO & LEVEL UP
  socket.on('build', (data) => {
      const room = rooms[data.roomId];
      if (!room || !room.players[socket.id]) return;
      const p = room.players[socket.id];
      
      if(p.inv.wood >= 10) {
          p.inv.wood -= 10;
          room.buildings.push({ x: p.x, y: p.y, hp: 150, maxHp: 150, type: 'wall' });
      }
  });

  socket.on('levelUpChoice', (data) => {
      const room = rooms[data.roomId];
      if (!room) return;
      const p = room.players[socket.id];
      
      if(data.choice === 'dmg') p.dmg *= 1.25;
      if(data.choice === 'hp') { p.maxHp += 50; p.hp = p.maxHp; }
      if(data.choice === 'spd') p.speedMult *= 1.1;
      
      room.difficulty += 0.1; // Jogo fica mais difícil
  });

  socket.on('respawn', (roomId) => {
      const room = rooms[roomId];
      if(room && room.players[socket.id]) {
          const p = room.players[socket.id];
          p.dead = false; p.hp = p.maxHp;
          p.x = 1200; p.y = 1200;
      }
  });

  socket.on('disconnect', () => {
      for (const r in rooms) {
          if (rooms[r].players[socket.id]) delete rooms[r].players[socket.id];
          // Limpa sala vazia pra não pesar o server
          if (Object.keys(rooms[r].players).length === 0) delete rooms[r];
      }
  });
});

/* === LÓGICA DE LOOP SEGURA === */
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
    let res = [];
    for(let i=0; i<30; i++) res.push({ id: `t${i}`, x: Math.random()*2400, y: Math.random()*2400, type: 'tree', hp: 30, maxHp: 30 });
    for(let i=0; i<15; i++) res.push({ id: `r${i}`, x: Math.random()*2400, y: Math.random()*2400, type: 'rock', hp: 50, maxHp: 50 });
    return res;
}

function spawnEnemies(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    
    room.enemies = [];
    const count = 5 + Math.floor(room.difficulty * 2);
    
    for (let i = 0; i < count; i++) {
        room.enemies.push({
            id: i,
            x: Math.random() * 2400, y: Math.random() * 2400,
            hp: 40 * room.difficulty, maxHp: 40 * room.difficulty,
            speed: 2 + Math.random(),
            dead: false, respawnTimer: 0
        });
    }
}

// GAME LOOP - 30 FPS
setInterval(() => {
  try {
      for (const rId in rooms) {
        const room = rooms[rId];
        // Pula sala se estiver vazia ou inválida
        if (!room || Object.keys(room.players).length === 0) continue;

        // INIMIGOS
        room.enemies.forEach(e => {
            if (e.dead) {
                e.respawnTimer--;
                if (e.respawnTimer <= 0) {
                    e.dead = false; e.hp = e.maxHp;
                    e.x = Math.random()*2400; e.y = Math.random()*2400;
                }
                return;
            }

            // Achar player mais próximo
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
                // Move
                const angle = Math.atan2(target.y - e.y, target.x - e.x);
                // Colisão simples com Paredes
                let blocked = false;
                room.buildings.forEach(b => {
                    if(Math.hypot(b.x - e.x, b.y - e.y) < 35) {
                        blocked = true;
                        b.hp -= 0.5;
                        if(b.hp<=0) b.dead = true;
                    }
                });
                room.buildings = room.buildings.filter(b => !b.dead);

                if(!blocked && minDist > 25) {
                    e.x += Math.cos(angle) * e.speed;
                    e.y += Math.sin(angle) * e.speed;
                }
                
                // Dano no player
                if(minDist < 30) {
                    target.hp -= 0.5;
                    if(target.hp <= 0) target.dead = true;
                }
            }
        });

        // XP Orbs (Coleta)
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
                    return false; // Remove orb
                }
                return true; // Mantém orb
            });
        }

        io.to(rId).emit('updateWorld', { 
            players: room.players, 
            enemies: room.enemies, 
            resources: room.resources, 
            buildings: room.buildings,
            xpOrbs: room.xpOrbs 
        });
      }
  } catch (err) {
      console.error("ERRO NO GAME LOOP:", err);
  }
}, 33);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console
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
