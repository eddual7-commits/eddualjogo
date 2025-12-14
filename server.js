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

// === LÓGICA DO JOGO ===
const rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

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

// Tipos de Cartas
const CARD_TYPES = [
    { type: 'HEAL', color: '#00ff00', label: '💚 VIDA' },
    { type: 'DMG',  color: '#ff0000', label: '⚔️ FORÇA' },
    { type: 'SPD',  color: '#00ffff', label: '⚡ SPEED' }
];

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    rooms[roomId] = { players: {}, enemies: [], cards: [] };
    
    rooms[roomId].players[socket.id] = { 
        x: 1200, y: 1200, role: 'warrior', 
        hp: 100, maxHp: 100, 
        dmgMult: 1, speedMult: 1 
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
          hp: 100, maxHp: 100,
          dmgMult: 1, speedMult: 1
      };
      
      socket.join(roomId);
      socket.emit('joinedRoom', roomId);
    }
  });

  socket.on('move', (data) => {
    const { roomId, x, y, state } = data;
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      rooms[roomId].players[socket.id].x = x;
      rooms[roomId].players[socket.id].y = y;
      rooms[roomId].players[socket.id].state = state;
    }
  });

  socket.on('attack', (data) => {
    const { roomId } = data;
    if (!rooms[roomId]) return;

    const p = rooms[roomId].players[socket.id];
    // Dano base * Multiplicador da Carta
    const baseDmg = p.role === 'warrior' ? 15 : 8;
    const finalDmg = baseDmg * (p.dmgMult || 1);
    const range = p.role === 'warrior' ? 120 : 300;

    rooms[roomId].enemies.forEach(e => {
        if (e.dead) return;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        
        if (dist < range) {
            e.hp -= finalDmg;
            e.x += (e.x - p.x) * 0.3; // Knockback
            e.y += (e.y - p.y) * 0.3;

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

// LOOP PRINCIPAL (20 FPS)
setInterval(() => {
  for (const rId in rooms) {
    const room = rooms[rId];
    if (Object.keys(room.players).length === 0) continue;

    // 1. Spawn de Cartas (Powerups)
    if (room.cards.length < 5 && Math.random() < 0.02) { // Chance de nascer carta
        const tipo = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
        room.cards.push({
            id: Math.random(),
            x: 1000 + Math.random() * 400,
            y: 1000 + Math.random() * 400,
            ...tipo
        });
    }

    // 2. Colisão Player <-> Carta
    Object.keys(room.players).forEach(pid => {
        const p = room.players[pid];
        
        // Checar colisão com cartas
        room.cards = room.cards.filter(card => {
            const dist = Math.hypot(p.x - card.x, p.y - card.y);
            if (dist < 40) {
                // Efeito da Carta
                if (card.type === 'HEAL') p.hp = Math.min(p.hp + 30, p.maxHp);
                if (card.type === 'DMG') p.dmgMult = 2; // Dobro de dano (temporário poderia ser, mas deixei fixo pra simplificar)
                if (card.type === 'SPD') p.speedMult = 1.5;

                io.to(rId).emit('cardCollect', { pid, type: card.type });
                return false; // Remove a carta
            }
            return true; // Mantém a carta
        });
    });

    // 3. IA Inimigos
    room.enemies.forEach(e => {
        if (e.dead) {
            e.respawnTimer--;
            if (e.respawnTimer <= 0) {
                e.dead = false; e.hp = e.maxHp;
                e.x = 1000 + Math.random() * 400; e.y = 1000 + Math.random() * 400;
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

        if (target && minDist < 500 && minDist > 30) {
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
