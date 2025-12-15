const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

/* ===============================
   SERVIR O INDEX (PARTE CRÍTICA)
   =============================== */
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

/* ===============================
   CONFIGURAÇÕES
   =============================== */
const CONFIG = {
    MAP_SIZE: 3000,
    ENEMY_SPAWN_RATE: 3000,
    MAX_ENEMIES: 25,
    ENEMY_BASE_HP: 60,
    ENEMY_BASE_DMG: 8,
    ENEMY_SPEED: 1.8,
    BOSS_SPAWN_CHANCE: 0.1,
    WAVE_INTERVAL: 60000,
    XP_BASE: 15
};

const rooms = {};

/* ===============================
   FUNÇÕES AUXILIARES
   =============================== */
function generateRoom() {
    const resources = [];
    const enemies = [];

    for (let cluster = 0; cluster < 20; cluster++) {
        const cx = 200 + Math.random() * (CONFIG.MAP_SIZE - 400);
        const cy = 200 + Math.random() * (CONFIG.MAP_SIZE - 400);
        const type = Math.random() > 0.4 ? 'tree' : 'stone';
        const count = 3 + Math.floor(Math.random() * 5);

        for (let i = 0; i < count; i++) {
            resources.push({
                id: Math.random().toString(36),
                x: cx + (Math.random() - 0.5) * 200,
                y: cy + (Math.random() - 0.5) * 200,
                type,
                hp: type === 'tree' ? 30 : 50,
                variant: Math.floor(Math.random() * 3)
            });
        }
    }

    return {
        resources,
        enemies,
        buildings: [],
        orbs: [],
        wave: 1,
        time: 0
    };
}

function createPlayer(name) {
    return {
        name: name || 'Hero',
        x: CONFIG.MAP_SIZE / 2,
        y: CONFIG.MAP_SIZE / 2,
        hp: 100,
        maxHp: 100,
        xp: 0,
        level: 1,
        nextLevel: 50,
        wood: 0,
        stone: 0,
        dead: false,
        state: 'idle',
        facing: 1,
        angle: 0,
        role: Math.random() > 0.5 ? 'warrior' : 'mage',
        upgrades: {}
    };
}

function checkLevelUp(socket, room, p) {
    if (p.xp >= p.nextLevel) {
        p.level++;
        p.xp -= p.nextLevel;
        p.nextLevel = Math.floor(p.nextLevel * 1.5);
        socket.emit('levelUp');
    }
}

function spawnEnemy(room) {
    if (room.enemies.length >= CONFIG.MAX_ENEMIES) return;

    const players = Object.values(room.players).filter(p => !p.dead);
    if (!players.length) return;

    const target = players[Math.floor(Math.random() * players.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 400 + Math.random() * 300;

    const types = ['slime', 'goblin', 'skeleton', 'demon', 'ghost'];
    const type = types[Math.floor(Math.random() * Math.min(types.length, room.wave + 1))];
    const isBoss = Math.random() < CONFIG.BOSS_SPAWN_CHANCE * room.wave;

    const base = {
        slime: { hp: 40, dmg: 5, speed: 1.2, xp: 10 },
        goblin: { hp: 60, dmg: 10, speed: 2.0, xp: 20 },
        skeleton: { hp: 80, dmg: 15, speed: 1.5, xp: 30 },
        demon: { hp: 120, dmg: 20, speed: 1.8, xp: 50 },
        ghost: { hp: 50, dmg: 12, speed: 2.5, xp: 25 }
    }[type];

    const mult = 1 + (room.wave - 1) * 0.3;

    room.enemies.push({
        id: Math.random().toString(36),
        x: Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, target.x + Math.cos(angle) * dist)),
        y: Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, target.y + Math.sin(angle) * dist)),
        type,
        hp: base.hp * mult * (isBoss ? 5 : 1),
        maxHp: base.hp * mult * (isBoss ? 5 : 1),
        dmg: base.dmg * mult * (isBoss ? 2 : 1),
        speed: base.speed,
        xp: base.xp * mult,
        isBoss,
        attackCooldown: 0,
        facing: 1,
        dead: false
    });
}

/* ===============================
   SOCKET.IO
   =============================== */
io.on('connection', socket => {

    socket.on('createRoom', name => {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        rooms[code] = {
            ...generateRoom(),
            players: {},
            lastSpawn: Date.now(),
            lastWave: Date.now()
        };
        rooms[code].players[socket.id] = createPlayer(name);
        socket.join(code);
        socket.emit('roomCreated', code);
    });

    socket.on('joinRoom', ({ code, name }) => {
        if (!rooms[code]) return;
        rooms[code].players[socket.id] = createPlayer(name);
        socket.join(code);
        socket.emit('joinedRoom', code);
    });

    socket.on('move', data => {
        const room = rooms[data.roomId];
        if (!room || !room.players[socket.id]) return;

        const p = room.players[socket.id];
        if (p.dead) return;

        p.x = data.x;
        p.y = data.y;
        p.state = data.state;
        p.facing = data.facing;
        p.angle = data.angle;
    });

    socket.on('attack', data => {
        const room = rooms[data.roomId];
        if (!room || !room.players[socket.id]) return;

        const p = room.players[socket.id];
        if (p.dead) return;

        room.enemies.forEach(e => {
            if (e.dead) return;
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < 250) {
                e.hp -= 20;
                if (e.hp <= 0) {
                    e.dead = true;
                    p.xp += e.xp;
                    checkLevelUp(socket, room, p);
                }
            }
        });

        room.enemies = room.enemies.filter(e => !e.dead);
    });

    socket.on('disconnect', () => {
        for (const code in rooms) {
            delete rooms[code].players[socket.id];
            if (Object.keys(rooms[code].players).length === 0) {
                delete rooms[code];
            }
        }
    });
});

/* ===============================
   GAME LOOP
   =============================== */
setInterval(() => {
    for (const code in rooms) {
        const room = rooms[code];
        room.time = (room.time + 16) % 300000;

        if (Date.now() - room.lastSpawn > CONFIG.ENEMY_SPAWN_RATE) {
            room.lastSpawn = Date.now();
            spawnEnemy(room);
        }

        io.to(code).emit('update', {
            players: room.players,
            enemies: room.enemies,
            resources: room.resources,
            buildings: room.buildings,
            orbs: room.orbs,
            wave: room.wave,
            time: room.time
        });
    }
}, 16);

/* ===============================
   START SERVER
   =============================== */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 server rodando na porta ${PORT}`);
});
