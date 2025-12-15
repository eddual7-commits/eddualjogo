const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static('.'));

// === CONFIGURAÇÕES DE DIFICULDADE ===
const CONFIG = {
    MAP_SIZE: 3000,
    ENEMY_SPAWN_RATE: 3000, // ms
    MAX_ENEMIES: 25,
    ENEMY_BASE_HP: 60,
    ENEMY_BASE_DMG: 8,
    ENEMY_SPEED: 1.8,
    BOSS_SPAWN_CHANCE: 0.1,
    WAVE_INTERVAL: 60000, // 1 minuto
    XP_BASE: 15
};

const rooms = {};

function generateRoom() {
    const resources = [];
    const enemies = [];
    
    // Gerar recursos em clusters (mais realista)
    for(let cluster = 0; cluster < 20; cluster++) {
        const cx = 200 + Math.random() * (CONFIG.MAP_SIZE - 400);
        const cy = 200 + Math.random() * (CONFIG.MAP_SIZE - 400);
        const type = Math.random() > 0.4 ? 'tree' : 'stone';
        const count = 3 + Math.floor(Math.random() * 5);
        
        for(let i = 0; i < count; i++) {
            resources.push({
                id: Math.random().toString(36),
                x: cx + (Math.random() - 0.5) * 200,
                y: cy + (Math.random() - 0.5) * 200,
                type,
                hp: type === 'tree' ? 30 : 50,
                variant: Math.floor(Math.random() * 3) // Variação visual
            });
        }
    }
    
    return { resources, enemies, buildings: [], orbs: [], wave: 1, time: 0 };
}

function spawnEnemy(room, forceType = null) {
    if(room.enemies.length >= CONFIG.MAX_ENEMIES) return;
    
    const playerPositions = Object.values(room.players).map(p => ({x: p.x, y: p.y}));
    if(playerPositions.length === 0) return;
    
    // Spawn perto de um jogador aleatório
    const target = playerPositions[Math.floor(Math.random() * playerPositions.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 400 + Math.random() * 300;
    
    const types = ['slime', 'goblin', 'skeleton', 'demon', 'ghost'];
    const type = forceType || types[Math.floor(Math.random() * Math.min(types.length, room.wave + 1))];
    
    const isBoss = !forceType && Math.random() < CONFIG.BOSS_SPAWN_CHANCE * (room.wave * 0.5);
    const waveMultiplier = 1 + (room.wave - 1) * 0.3;
    
    const baseStats = {
        slime: { hp: 40, dmg: 5, speed: 1.2, xp: 10, color: '#2ecc71' },
        goblin: { hp: 60, dmg: 10, speed: 2.0, xp: 20, color: '#27ae60' },
        skeleton: { hp: 80, dmg: 15, speed: 1.5, xp: 30, color: '#ecf0f1' },
        demon: { hp: 120, dmg: 20, speed: 1.8, xp: 50, color: '#e74c3c' },
        ghost: { hp: 50, dmg: 12, speed: 2.5, xp: 25, color: '#9b59b6' }
    };
    
    const stats = baseStats[type];
    
    room.enemies.push({
        id: Math.random().toString(36),
        x: Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, target.x + Math.cos(angle) * dist)),
        y: Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, target.y + Math.sin(angle) * dist)),
        type,
        hp: stats.hp * waveMultiplier * (isBoss ? 5 : 1),
        maxHp: stats.hp * waveMultiplier * (isBoss ? 5 : 1),
        dmg: stats.dmg * waveMultiplier * (isBoss ? 2 : 1),
        speed: stats.speed * (isBoss ? 0.7 : 1),
        xp: stats.xp * waveMultiplier * (isBoss ? 5 : 1),
        color: stats.color,
        isBoss,
        target: null,
        attackCooldown: 0,
        state: 'idle',
        facing: 1
    });
}

io.on('connection', socket => {
    console.log('Player conectado:', socket.id);
    
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
        console.log('Sala criada:', code);
    });
    
    socket.on('joinRoom', ({code, name}) => {
        if(rooms[code]) {
            rooms[code].players[socket.id] = createPlayer(name);
            socket.join(code);
            socket.emit('joinedRoom', code);
        }
    });
    
    socket.on('move', data => {
        const room = rooms[data.roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        if(p.dead) return;
        
        p.x = data.x;
        p.y = data.y;
        p.state = data.state;
        p.facing = data.facing;
        p.angle = data.angle;
        
        // Coletar orbs
        room.orbs = room.orbs.filter(o => {
            if(Math.hypot(o.x - p.x, o.y - p.y) < 40) {
                p.xp += o.value;
                checkLevelUp(socket, room, p);
                return false;
            }
            return true;
        });
        
        // Auto-coleta de recursos próximos (quando parado)
        if(data.state === 'idle') {
            room.resources.forEach(r => {
                if(Math.hypot(r.x - p.x, r.y - p.y) < 50) {
                    socket.emit('nearResource', r.id);
                }
            });
        }
    });
    
    socket.on('attack', data => {
        const room = rooms[data.roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        if(p.dead) return;
        
        const angle = data.angle;
        const range = 250 + (p.upgrades.range || 0) * 50;
        const dmg = (15 + p.level * 3) * (1 + (p.upgrades.dmg || 0) * 0.4);
        const multiShot = p.upgrades.multi || 1;
        
        // Múltiplos projéteis
        for(let i = 0; i < multiShot; i++) {
            const spreadAngle = angle + (i - (multiShot - 1) / 2) * 0.2;
            
            // Atacar inimigos
            room.enemies.forEach(e => {
                if(e.dead) return;
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                const enemyAngle = Math.atan2(e.y - p.y, e.x - p.x);
                const angleDiff = Math.abs(spreadAngle - enemyAngle);
                
                if(dist < range && angleDiff < 0.5) {
                    e.hp -= dmg;
                    io.to(data.roomId).emit('dmg', {x: e.x, y: e.y, val: Math.floor(dmg), crit: Math.random() > 0.8});
                    
                    // Vampirismo
                    if(p.upgrades.vamp && Math.random() > 0.5) {
                        p.hp = Math.min(p.maxHp, p.hp + dmg * 0.2);
                    }
                    
                    if(e.hp <= 0) {
                        e.dead = true;
                        // Spawn orbs
                        for(let j = 0; j < 3; j++) {
                            room.orbs.push({
                                x: e.x + (Math.random() - 0.5) * 30,
                                y: e.y + (Math.random() - 0.5) * 30,
                                value: Math.floor(e.xp / 3)
                            });
                        }
                        io.to(data.roomId).emit('enemyDeath', {x: e.x, y: e.y, type: e.type, isBoss: e.isBoss});
                    }
                }
            });
            
            // Atacar recursos
            room.resources.forEach(r => {
                const dist = Math.hypot(r.x - p.x, r.y - p.y);
                if(dist < 80) {
                    r.hp -= 10;
                    if(r.hp <= 0) {
                        const gain = 3 + Math.floor(Math.random() * 3);
                        if(r.type === 'tree') p.wood += gain;
                        else p.stone += gain;
                        io.to(data.roomId).emit('resBreak', {x: r.x, y: r.y, type: r.type});
                        r.dead = true;
                    }
                }
            });
        }
        
        room.resources = room.resources.filter(r => !r.dead);
        room.enemies = room.enemies.filter(e => !e.dead);
    });
    
    socket.on('build', data => {
        const room = rooms[data.roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        const costs = {
            table: {wood: 5, stone: 0},
            wall_wood: {wood: 10, stone: 0},
            wall_stone: {wood: 0, stone: 10},
            campfire: {wood: 15, stone: 5},
            turret: {wood: 20, stone: 10},
            spike: {wood: 5, stone: 5}
        };
        
        const c = costs[data.type];
        if(p.wood >= c.wood && p.stone >= c.stone) {
            p.wood -= c.wood;
            p.stone -= c.stone;
            
            room.buildings.push({
                id: Math.random().toString(36),
                type: data.type,
                x: p.x + (Math.random() - 0.5) * 60,
                y: p.y + 50,
                hp: data.type === 'wall_stone' ? 200 : 100,
                owner: socket.id,
                lastShot: 0
            });
        }
    });
    
    socket.on('levelup', data => {
        const room = rooms[data.roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        if(!p.upgrades) p.upgrades = {};
        
        switch(data.choice) {
            case 'multi': p.upgrades.multi = (p.upgrades.multi || 1) + 2; break;
            case 'vamp': p.upgrades.vamp = true; break;
            case 'dmg': p.upgrades.dmg = (p.upgrades.dmg || 0) + 1; break;
            case 'hp': p.hp = p.maxHp; p.maxHp += 20; p.hp = p.maxHp; break;
            case 'speed': p.upgrades.speed = (p.upgrades.speed || 0) + 1; break;
            case 'range': p.upgrades.range = (p.upgrades.range || 0) + 1; break;
        }
    });
    
    socket.on('respawn', roomId => {
        const room = rooms[roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        p.dead = false;
        p.hp = p.maxHp;
        p.x = CONFIG.MAP_SIZE / 2;
        p.y = CONFIG.MAP_SIZE / 2;
    });
    
    socket.on('disconnect', () => {
        for(const code in rooms) {
            delete rooms[code].players[socket.id];
            if(Object.keys(rooms[code].players).length === 0) {
                delete rooms[code];
            }
        }
    });
});

function createPlayer(name) {
    return {
        name: name || 'Herói',
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
    if(p.xp >= p.nextLevel) {
        p.level++;
        p.xp -= p.nextLevel;
        p.nextLevel = Math.floor(p.nextLevel * 1.5);
        socket.emit('levelUp');
    }
}

// Game Loop
setInterval(() => {
    for(const code in rooms) {
        const room = rooms[code];
        room.time = (room.time + 16) % 300000; // Ciclo dia/noite de 5 min
        
        // Spawn de inimigos
        if(Date.now() - room.lastSpawn > CONFIG.ENEMY_SPAWN_RATE / (room.wave * 0.5 + 1)) {
            room.lastSpawn = Date.now();
            spawnEnemy(room);
        }
        
        // Sistema de Waves
        if(Date.now() - room.lastWave > CONFIG.WAVE_INTERVAL) {
            room.lastWave = Date.now();
            room.wave++;
            io.to(code).emit('newWave', room.wave);
            
            // Spawn de wave
            for(let i = 0; i < room.wave * 3; i++) {
                setTimeout(() => spawnEnemy(room), i * 200);
            }
        }
        
        // AI dos inimigos
        room.enemies.forEach(e => {
            if(e.dead) return;
            
            // Encontrar jogador mais próximo
            let closest = null, minDist = 500;
            for(const id in room.players) {
                const p = room.players[id];
                if(p.dead) continue;
                const d = Math.hypot(p.x - e.x, p.y - e.y);
                if(d < minDist) { minDist = d; closest = p; }
            }
            
            if(closest) {
                e.state = 'chase';
                const angle = Math.atan2(closest.y - e.y, closest.x - e.x);
                e.x += Math.cos(angle) * e.speed;
                e.y += Math.sin(angle) * e.speed;
                e.facing = Math.cos(angle) > 0 ? 1 : -1;
                
                // Atacar
                if(minDist < 40 && e.attackCooldown <= 0) {
                    closest.hp -= e.dmg;
                    e.attackCooldown = 60;
                    io.to(code).emit('playerHit', {id: Object.keys(room.players).find(id => room.players[id] === closest), dmg: e.dmg});
                    
                    if(closest.hp <= 0) {
                        closest.dead = true;
                        io.to(code).emit('playerDeath', closest.name);
                    }
                }
            } else {
                e.state = 'idle';
            }
            
            if(e.attackCooldown > 0) e.attackCooldown--;
        });
        
        // Torretas
        room.buildings.forEach(b => {
            if(b.type === 'turret' && Date.now() - b.lastShot > 1000) {
                let closest = null, minDist = 300;
                room.enemies.forEach(e => {
                    if(e.dead) return;
                    const d = Math.hypot(e.x - b.x, e.y - b.y);
                    if(d < minDist) { minDist = d; closest = e; }
                });
                
                if(closest) {
                    b.lastShot = Date.now();
                    closest.hp -= 20;
                    io.to(code).emit('turretShot', {sx: b.x, sy: b.y, ex: closest.x, ey: closest.y});
                    if(closest.hp <= 0) closest.dead = true;
                }
            }
        });
        
        room.enemies = room.enemies.filter(e => !e.dead);
        
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎮 RPG Legends V7 rodando na porta ${PORT}`));
