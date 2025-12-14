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

/* === JOGO === */
const rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

const CARD_TYPES = [
    { type: 'HEAL', color: '#00ff00' },
    { type: 'DMG',  color: '#ff0000' },
    { type: 'SPD',  color: '#00ffff' }
];

function spawnEnemies(roomId) {
    rooms[roomId].enemies = [];
    for (let i = 0; i < 6; i++) {
        rooms[roomId].enemies.push({
            id: i,
            x: 1000 + Math.random() * 400,
            y: 1000 + Math.random() * 400,
            hp: 40, maxHp: 40,
            dead: false, respawnTimer: 0
        });
    }
}

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    rooms[roomId] = { players: {}, enemies: [], cards: [] };
    
    rooms[roomId].players[socket.id] = { 
        x: 1200, y: 1200, role: 'warrior', 
        hp: 100, maxHp: 100, dmgMult: 1, speedMult: 1 
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
          hp: 100, maxHp: 100, dmgMult: 1, speedMult: 1
      };
      socket.join(roomId);
      socket.emit('joinedRoom', roomId);
    }
  });

  socket.on('move', (data) => {
    const { roomId, x, y, state, facing } = data;
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      const p = rooms[roomId].players[socket.id];
      p.x = x;
      p.y = y;
      p.state = state;
      p.facing = facing || 0; // Direção que o player olha
    }
  });

  socket.on('attack', (data) => {
    const { roomId } = data;
    if (!rooms[roomId]) return;

    const p = rooms[roomId].players[socket.id];
    const baseDmg = p.role === 'warrior' ? 15 : 8;
    const finalDmg = baseDmg * (p.dmgMult || 1);
    const range = p.role === 'warrior' ? 140 : 300;

    rooms[roomId].enemies.forEach(e => {
        if (e.dead) return;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        
        if (dist < range) {
            e.hp -= finalDmg;
            // Knockback baseado na posição
            const angle = Math.atan2(e.y - p.y, e.x - p.x);
            e.x += Math.cos(angle) * 30;
            e.y += Math.sin(angle) * 30;

            if (e.hp <= 0) {
                e.dead = true;
                e.respawnTimer = 100;
            }
            io.to(roomId).emit('enemyHit', { id: e.id, x: e.x, y: e.y });
        }
    });
  });

  socket.on('disconnect', () => {
      for (const r in rooms) {
          if (rooms[r].players[socket.id]) delete rooms[r].players[socket.id];
      }
  });
});

setInterval(() => {
  for (const rId in rooms) {
    const room = rooms[rId];
    if (Object.keys(room.players).length === 0) continue;

    // Cartas
    if (room.cards.length < 5 && Math.random() < 0.01) {
        const tipo = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
        room.cards.push({
            id: Math.random(),
            x: 500 + Math.random() * 1400, // Espalhar mais
            y: 500 + Math.random() * 1400,
            ...tipo
        });
    }

    // Colisão Carta
    Object.keys(room.players).forEach(pid => {
        const p = room.players[pid];
        room.cards = room.cards.filter(card => {
            if (Math.hypot(p.x - card.x, p.y - card.y) < 50) {
                if (card.type === 'HEAL') p.hp = Math.min(p.hp + 40, p.maxHp);
                if (card.type === 'DMG') p.dmgMult = 2; 
                if (card.type === 'SPD') p.speedMult = 1.6;
                
                io.to(rId).emit('cardCollect', { pid, type: card.type });
                return false;
            }
            return true;
        });
    });

    // Inimigos
    room.enemies.forEach(e => {
        if (e.dead) {
            e.respawnTimer--;
            if (e.respawnTimer <= 0) {
                e.dead = false; e.hp = e.maxHp;
                e.x = 1000 + Math.random() * 400; 
                e.y = 1000 + Math.random() * 400;
            }
            return;
        }

        let target = null;
        let minDist = 9999;
        Object.keys(room.players).forEach(pid => {
            const p = room.players[pid];
            const d = Math.hypot(p.x - e.x, p.y - e.y);
            if (d < minDist) { minDist = d; target = p; }
        });

        if (target && minDist < 600 && minDist > 30) {
            const angle = Math.atan2(target.y - e.y, target.x - e.x);
            e.x += Math.cos(angle) * 2.5;
            e.y += Math.sin(angle) * 2.5;
        }
    });

    io.to(rId).emit('updateWorld', { players: room.players, enemies: room.enemies, cards: room.cards });
  }
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Rodando na porta ${PORT}`); });
