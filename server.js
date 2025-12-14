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

/* === LÓGICA DO JOGO === */
const rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function spawnEnemies(roomId) {
    rooms[roomId].enemies = [];
    for (let i = 0; i < 8; i++) {
        rooms[roomId].enemies.push({
            id: i,
            x: 800 + Math.random() * 800,
            y: 800 + Math.random() * 800,
            hp: 50, maxHp: 50,
            dead: false, respawnTimer: 0,
            // Estado de Ataque
            dashTimer: 0,
            isDashing: false
        });
    }
}

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    rooms[roomId] = { players: {}, enemies: [] };
    
    rooms[roomId].players[socket.id] = { 
        x: 1200, y: 1200, role: 'warrior', 
        hp: 100, maxHp: 100, facing: 0, state: 'idle'
    };
    spawnEnemies(roomId);
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
  });

  socket.on('joinRoom', (roomId) => {
    if (rooms[roomId]) {
      const role = Object.keys(rooms[roomId].players).length === 0 ? 'warrior' : 'mage';
      rooms[roomId].players[socket.id] = { 
          x: 1200, y: 1200, role: role, 
          hp: 100, maxHp: 100, facing: 0, state: 'idle'
      };
      socket.join(roomId);
      socket.emit('joinedRoom', roomId);
    }
  });

  socket.on('move', (data) => {
    const { roomId, x, y, state, facing } = data;
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      const p = rooms[roomId].players[socket.id];
      // Validação básica anti-teleporte
      if (Math.abs(p.x - x) < 50 && Math.abs(p.y - y) < 50) {
          p.x = x; p.y = y;
      }
      p.state = state;
      p.facing = facing || 0;
    }
  });

  socket.on('attack', (data) => {
    const { roomId } = data;
    if (!rooms[roomId]) return;

    const p = rooms[roomId].players[socket.id];
    // Dano e Alcance baseados na classe
    const dmg = p.role === 'warrior' ? 20 : 12;
    const range = p.role === 'warrior' ? 130 : 280;

    rooms[roomId].enemies.forEach(e => {
        if (e.dead) return;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        
        if (dist < range) {
            e.hp -= dmg;
            // Knockback (Empurrão)
            const angle = Math.atan2(e.y - p.y, e.x - p.x);
            e.x += Math.cos(angle) * 40;
            e.y += Math.sin(angle) * 40;

            if (e.hp <= 0) {
                e.dead = true;
                e.respawnTimer = 100; // 5 segundos
            }
            io.to(roomId).emit('enemyHit', { id: e.id, x: e.x, y: e.y, dmg: dmg });
        }
    });
  });

  socket.on('disconnect', () => {
      for (const r in rooms) {
          if (rooms[r].players[socket.id]) delete rooms[r].players[socket.id];
      }
  });
});

// LOOP DO SERVIDOR (60 FPS para física melhor)
setInterval(() => {
  for (const rId in rooms) {
    const room = rooms[rId];
    if (Object.keys(room.players).length === 0) continue;

    // === IA DOS INIMIGOS (COM DASH) ===
    room.enemies.forEach(e => {
        if (e.dead) {
            e.respawnTimer--;
            if (e.respawnTimer <= 0) {
                e.dead = false; e.hp = e.maxHp;
                e.x = 1000 + Math.random() * 400; e.y = 1000 + Math.random() * 400;
            }
            return;
        }

        // Achar player mais próximo
        let target = null;
        let minDist = 9999;
        Object.keys(room.players).forEach(pid => {
            const p = room.players[pid];
            if(p.hp <= 0) return; // Ignora mortos
            const d = Math.hypot(p.x - e.x, p.y - e.y);
            if (d < minDist) { minDist = d; target = p; targetId = pid; }
        });

        if (target) {
            const dx = target.x - e.x;
            const dy = target.y - e.y;
            const angle = Math.atan2(dy, dx);
            
            // Lógica do DASH
            if (minDist < 250 && minDist > 50 && e.dashTimer <= 0) {
                // Prepara Dash
                e.isDashing = true;
                e.dashTimer = 60; // Cooldown
                e.vx = Math.cos(angle) * 12; // Velocidade Explosiva
                e.vy = Math.sin(angle) * 12;
            }

            if (e.isDashing) {
                // Executa Dash
                e.x += e.vx;
                e.y += e.vy;
                e.vx *= 0.9; e.vy *= 0.9; // Freia
                if (Math.abs(e.vx) < 1) e.isDashing = false;
            } else if (minDist > 40) {
                // Movimento Normal
                e.x += Math.cos(angle) * 2;
                e.y += Math.sin(angle) * 2;
                e.dashTimer--;
            }

            // DANO NO PLAYER
            if (minDist < 30 && !e.dead) {
                // Se tocou, tira vida
                if (room.players[targetId].hp > 0) {
                    room.players[targetId].hp -= 1; // Dano contínuo se ficar encostado
                }
            }
        }
    });

    io.to(rId).emit('updateWorld', { players: room.players, enemies: room.enemies });
  }
}, 33); // 30 FPS Update Rate

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Rodando na porta ${PORT}`); });
