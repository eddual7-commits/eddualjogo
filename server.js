const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// IMPORTANTE: Servir arquivos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// === CONFIGURAÇÕES ===
const CONFIG = {
    MAP_SIZE: 3000,
    ENEMY_SPAWN_RATE: 2500,
    MAX_ENEMIES: 30,
    WAVE_INTERVAL: 45000,
    RESOURCE_RESPAWN: 30000
};

const rooms = {};

// Frases dos inimigos
const ENEMY_QUOTES = {
    slime: ["Blurp blurp!", "Gosmento...", "*barulho molhado*", "Vou te absorver!"],
    goblin: ["Ouro! Quero ouro!", "Hehe, carne fresca!", "Vem aqui, humaninho!", "Meus dentes estão afiados!"],
    skeleton: ["Seus ossos serão meus!", "A morte te aguarda...", "Clack clack clack!", "Junte-se aos mortos!"],
    demon: ["BURN!", "Sua alma é MINHA!", "Fogo eterno!", "Sofra nas chamas!"],
    ghost: ["Buuuu~", "Posso ver através de você...", "Frio... tão frio...", "Você será um de nós!"],
    witch: ["Hehehe, um novo sapo!", "Minha poção precisa de você!", "Abracadabra!", "Venha, meu querido~"],
    dragon: ["ROOOAR!", "Insignificante mortal!", "Fogo do inferno!", "Eu sou a DESTRUIÇÃO!"]
};

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for(let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateRoom() {
    const resources = [];
    
    // Gerar recursos em clusters
    for(let cluster = 0; cluster < 25; cluster++) {
        const cx = 150 + Math.random() * (CONFIG.MAP_SIZE - 300);
        const cy = 150 + Math.random() * (CONFIG.MAP_SIZE - 300);
        const type = Math.random() > 0.4 ? 'tree' : 'stone';
        const count = 4 + Math.floor(Math.random() * 4);
        
        for(let i = 0; i < count; i++) {
            resources.push({
                id: Math.random().toString(36).substr(2, 9),
                x: cx + (Math.random() - 0.5) * 180,
                y: cy + (Math.random() - 0.5) * 180,
                type,
                hp: type === 'tree' ? 25 : 40,
                maxHp: type === 'tree' ? 25 : 40,
                variant: Math.floor(Math.random() * 3)
            });
        }
    }
    
    // Adicionar cristais especiais (dão mais recursos)
    for(let i = 0; i < 10; i++) {
        resources.push({
            id: Math.random().toString(36).substr(2, 9),
            x: 200 + Math.random() * (CONFIG.MAP_SIZE - 400),
            y: 200 + Math.random() * (CONFIG.MAP_SIZE - 400),
            type: 'crystal',
            hp: 60,
            maxHp: 60,
            variant: Math.floor(Math.random() * 3)
        });
    }
    
    return { 
        resources, 
        enemies: [], 
        buildings: [], 
        orbs: [], 
        wave: 1, 
        time: 0,
        messages: [] // Mensagens dos inimigos
    };
}

function createPlayer(name, socketId) {
    return {
        id: socketId,
        name: name || 'Miku',
        x: CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200,
        y: CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200,
        hp: 100,
        maxHp: 100,
        xp: 0,
        level: 1,
        nextLevel: 50,
        dead: false,
        state: 'idle',
        facing: 1,
        angle: 0,
        // Inventário
        inventory: {
            wood: 0,
            stone: 0,
            crystal: 0,
            food: 3 // Comida inicial
        },
        // Stats
        stats: {
            damage: 10,
            speed: 1,
            attackSpeed: 1,
            range: 200,
            critChance: 0.1,
            lifeSteal: 0
        },
        // Upgrades aplicados
        upgrades: [],
        // Visual (cores do cabelo estilo Miku)
        hairColor: ['#39C5BB', '#00D4AA', '#00BFFF'][Math.floor(Math.random() * 3)],
        outfitColor: ['#1A1A2E', '#2D2D44', '#16213E'][Math.floor(Math.random() * 3)]
    };
}

function spawnEnemy(room) {
    if(room.enemies.length >= CONFIG.MAX_ENEMIES) return;
    
    const playerPositions = Object.values(room.players).filter(p => !p.dead).map(p => ({x: p.x, y: p.y}));
    if(playerPositions.length === 0) return;
    
    const target = playerPositions[Math.floor(Math.random() * playerPositions.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 400 + Math.random() * 400;
    
    // Tipos baseados na wave
    const availableTypes = ['slime'];
    if(room.wave >= 2) availableTypes.push('goblin');
    if(room.wave >= 3) availableTypes.push('skeleton');
    if(room.wave >= 4) availableTypes.push('ghost');
    if(room.wave >= 5) availableTypes.push('witch');
    if(room.wave >= 6) availableTypes.push('demon');
    if(room.wave >= 8) availableTypes.push('dragon');
    
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const isBoss = Math.random() < 0.08 * room.wave;
    const waveMultiplier = 1 + (room.wave - 1) * 0.25;
    
    const baseStats = {
        slime:    { hp: 30,  dmg: 5,  speed: 1.5, xp: 10, color: '#00D4AA' },
        goblin:   { hp: 50,  dmg: 8,  speed: 2.2, xp: 20, color: '#27AE60' },
        skeleton: { hp: 70,  dmg: 12, speed: 1.8, xp: 30, color: '#ECF0F1' },
        ghost:    { hp: 40,  dmg: 10, speed: 2.8, xp: 25, color: '#9B59B6' },
        witch:    { hp: 60,  dmg: 15, speed: 1.5, xp: 40, color: '#8E44AD' },
        demon:    { hp: 100, dmg: 20, speed: 2.0, xp: 50, color: '#E74C3C' },
        dragon:   { hp: 200, dmg: 30, speed: 1.2, xp: 100, color: '#F39C12' }
    };
    
    const stats = baseStats[type];
    const bossMultiplier = isBoss ? 4 : 1;
    
    room.enemies.push({
        id: Math.random().toString(36).substr(2, 9),
        x: Math.max(100, Math.min(CONFIG.MAP_SIZE - 100, target.x + Math.cos(angle) * dist)),
        y: Math.max(100, Math.min(CONFIG.MAP_SIZE - 100, target.y + Math.sin(angle) * dist)),
        type,
        hp: Math.floor(stats.hp * waveMultiplier * bossMultiplier),
        maxHp: Math.floor(stats.hp * waveMultiplier * bossMultiplier),
        dmg: Math.floor(stats.dmg * waveMultiplier * (isBoss ? 1.5 : 1)),
        speed: stats.speed * (isBoss ? 0.8 : 1),
        xp: Math.floor(stats.xp * waveMultiplier * bossMultiplier),
        color: stats.color,
        isBoss,
        target: null,
        attackCooldown: 0,
        state: 'idle',
        facing: 1,
        speakCooldown: 0,
        lastSpoke: ''
    });
}

// === SOCKET HANDLERS ===
io.on('connection', socket => {
    console.log('🎮 Player conectado:', socket.id);
    
    socket.on('createRoom', name => {
        const code = generateRoomCode();
        rooms[code] = {
            ...generateRoom(),
            players: {},
            lastSpawn: Date.now(),
            lastWave: Date.now(),
            code: code
        };
        rooms[code].players[socket.id] = createPlayer(name, socket.id);
        socket.join(code);
        socket.roomCode = code;
        
        // ENVIA O CÓDIGO DA SALA PRO JOGADOR
        socket.emit('roomCreated', { code: code, playerId: socket.id });
        console.log('🏠 Sala criada:', code);
    });
    
    socket.on('joinRoom', ({code, name}) => {
        const upperCode = code.toUpperCase();
        if(rooms[upperCode]) {
            rooms[upperCode].players[socket.id] = createPlayer(name, socket.id);
            socket.join(upperCode);
            socket.roomCode = upperCode;
            socket.emit('joinedRoom', { code: upperCode, playerId: socket.id });
            
            // Notifica outros jogadores
            socket.to(upperCode).emit('playerJoined', { name: name });
            console.log('👋 Player entrou na sala:', upperCode);
        } else {
            socket.emit('error', { message: 'Sala não encontrada!' });
        }
    });
    
    socket.on('move', data => {
        const room = rooms[data.roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        if(p.dead) return;
        
        p.x = Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, data.x));
        p.y = Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, data.y));
        p.state = data.state;
        p.facing = data.facing;
        p.angle = data.angle;
        
        // Coletar orbs automaticamente
        room.orbs = room.orbs.filter(o => {
            const dist = Math.hypot(o.x - p.x, o.y - p.y);
            if(dist < 50) {
                p.xp += o.value;
                checkLevelUp(socket, room, p);
                return false;
            }
            return true;
        });
    });
    
    socket.on('attack', data => {
        const room = rooms[data.roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        if(p.dead) return;
        
        const angle = data.angle;
        const range = p.stats.range;
        const baseDmg = p.stats.damage;
        const isCrit = Math.random() < p.stats.critChance;
        const dmg = Math.floor(baseDmg * (isCrit ? 2.5 : 1));
        
        // Verificar upgrades de multi-shot
        const shots = p.upgrades.includes('multi') ? 3 : 1;
        
        for(let s = 0; s < shots; s++) {
            const spreadAngle = angle + (s - (shots - 1) / 2) * 0.25;
            
            // Atacar inimigos
            room.enemies.forEach(e => {
                if(e.dead) return;
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                const enemyAngle = Math.atan2(e.y - p.y, e.x - p.x);
                let angleDiff = Math.abs(spreadAngle - enemyAngle);
                if(angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                
                if(dist < range && angleDiff < 0.4) {
                    e.hp -= dmg;
                    
                    // Feedback de dano
                    io.to(data.roomId).emit('damage', {
                        x: e.x + (Math.random() - 0.5) * 20,
                        y: e.y - 20,
                        value: dmg,
                        crit: isCrit
                    });
                    
                    // Life steal
                    if(p.stats.lifeSteal > 0) {
                        p.hp = Math.min(p.maxHp, p.hp + dmg * p.stats.lifeSteal);
                    }
                    
                    // Knockback
                    const kb = 10;
                    e.x += Math.cos(spreadAngle) * kb;
                    e.y += Math.sin(spreadAngle) * kb;
                    
                    if(e.hp <= 0) {
                        e.dead = true;
                        
                        // Spawn XP orbs
                        const orbCount = e.isBoss ? 8 : 3;
                        for(let j = 0; j < orbCount; j++) {
                            room.orbs.push({
                                id: Math.random().toString(36).substr(2, 9),
                                x: e.x + (Math.random() - 0.5) * 40,
                                y: e.y + (Math.random() - 0.5) * 40,
                                value: Math.floor(e.xp / orbCount)
                            });
                        }
                        
                        // Chance de drop de comida
                        if(Math.random() < 0.2) {
                            p.inventory.food++;
                            socket.emit('itemPickup', { type: 'food', amount: 1 });
                        }
                        
                        io.to(data.roomId).emit('enemyDeath', {
                            x: e.x, y: e.y,
                            type: e.type,
                            isBoss: e.isBoss
                        });
                    }
                }
            });
            
            // Atacar recursos
            room.resources.forEach(r => {
                if(r.dead) return;
                const dist = Math.hypot(r.x - p.x, r.y - p.y);
                if(dist < 100) {
                    r.hp -= 10;
                    
                    io.to(data.roomId).emit('resourceHit', {
                        id: r.id,
                        x: r.x,
                        y: r.y,
                        type: r.type,
                        hp: r.hp,
                        maxHp: r.maxHp
                    });
                    
                    if(r.hp <= 0) {
                        r.dead = true;
                        
                        // Dar recursos pro jogador
                        const amounts = {
                            tree: { item: 'wood', min: 3, max: 6 },
                            stone: { item: 'stone', min: 2, max: 5 },
                            crystal: { item: 'crystal', min: 1, max: 3 }
                        };
                        
                        const drop = amounts[r.type];
                        const amount = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
                        p.inventory[drop.item] += amount;
                        
                        socket.emit('itemPickup', { type: drop.item, amount: amount });
                        
                        io.to(data.roomId).emit('resourceBreak', {
                            id: r.id,
                            x: r.x,
                            y: r.y,
                            type: r.type
                        });
                    }
                }
            });
        }
        
        // Remove recursos mortos
        room.resources = room.resources.filter(r => !r.dead);
        room.enemies = room.enemies.filter(e => !e.dead);
    });
    
    socket.on('useFood', data => {
        const room = rooms[data.roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        if(p.inventory.food > 0 && p.hp < p.maxHp) {
            p.inventory.food--;
            p.hp = Math.min(p.maxHp, p.hp + 30);
            socket.emit('healed', { hp: p.hp, maxHp: p.maxHp });
        }
    });
    
    socket.on('build', data => {
        const room = rooms[data.roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        const inv = p.inventory;
        
        const costs = {
            table:      { wood: 5,  stone: 0,  crystal: 0 },
            wall_wood:  { wood: 10, stone: 0,  crystal: 0 },
            wall_stone: { wood: 0,  stone: 10, crystal: 0 },
            campfire:   { wood: 15, stone: 5,  crystal: 0 },
            turret:     { wood: 20, stone: 15, crystal: 2 },
            spike:      { wood: 8,  stone: 8,  crystal: 0 },
            healing:    { wood: 10, stone: 5,  crystal: 3 }
        };
        
        const cost = costs[data.type];
        if(!cost) return;
        
        if(inv.wood >= cost.wood && inv.stone >= cost.stone && inv.crystal >= cost.crystal) {
            inv.wood -= cost.wood;
            inv.stone -= cost.stone;
            inv.crystal -= cost.crystal;
            
            const buildAngle = p.angle;
            const buildDist = 60;
            
            room.buildings.push({
                id: Math.random().toString(36).substr(2, 9),
                type: data.type,
                x: p.x + Math.cos(buildAngle) * buildDist,
                y: p.y + Math.sin(buildAngle) * buildDist,
                hp: data.type.includes('stone') ? 250 : 150,
                maxHp: data.type.includes('stone') ? 250 : 150,
                owner: socket.id,
                lastAction: 0
            });
            
            socket.emit('buildSuccess', { type: data.type });
        } else {
            socket.emit('buildFailed', { message: 'Recursos insuficientes!' });
        }
    });
    
    socket.on('selectUpgrade', data => {
        const room = rooms[data.roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        
        // Aplica o upgrade
        switch(data.choice) {
            case 'damage':
                p.stats.damage += 8;
                break;
            case 'speed':
                p.stats.speed += 0.2;
                break;
            case 'health':
                p.maxHp += 25;
                p.hp = p.maxHp;
                break;
            case 'crit':
                p.stats.critChance += 0.15;
                break;
            case 'range':
                p.stats.range += 40;
                break;
            case 'vampire':
                p.stats.lifeSteal += 0.15;
                break;
            case 'multi':
                if(!p.upgrades.includes('multi')) {
                    p.upgrades.push('multi');
                } else {
                    p.stats.damage += 5; // Se já tem, dá dano extra
                }
                break;
            case 'attackSpeed':
                p.stats.attackSpeed += 0.25;
                break;
        }
        
        p.upgrades.push(data.choice);
        socket.emit('upgradeApplied', { choice: data.choice, stats: p.stats });
    });
    
    socket.on('respawn', roomId => {
        const room = rooms[roomId];
        if(!room || !room.players[socket.id]) return;
        
        const p = room.players[socket.id];
        p.dead = false;
        p.hp = p.maxHp;
        p.x = CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200;
        p.y = CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200;
        // Mantém metade do inventário
        p.inventory.wood = Math.floor(p.inventory.wood / 2);
        p.inventory.stone = Math.floor(p.inventory.stone / 2);
        p.inventory.crystal = Math.floor(p.inventory.crystal / 2);
    });
    
    socket.on('disconnect', () => {
        console.log('👋 Player desconectou:', socket.id);
        for(const code in rooms) {
            if(rooms[code].players[socket.id]) {
                delete rooms[code].players[socket.id];
                io.to(code).emit('playerLeft', { id: socket.id });
                
                if(Object.keys(rooms[code].players).length === 0) {
                    delete rooms[code];
                    console.log('🗑️ Sala deletada:', code);
                }
            }
        }
    });
});

function checkLevelUp(socket, room, p) {
    while(p.xp >= p.nextLevel) {
        p.xp -= p.nextLevel;
        p.level++;
        p.nextLevel = Math.floor(p.nextLevel * 1.4);
        p.maxHp += 10;
        p.hp = p.maxHp;
        
        socket.emit('levelUp', { level: p.level });
    }
}

// === GAME LOOP ===
setInterval(() => {
    for(const code in rooms) {
        const room = rooms[code];
        room.time = (room.time + 50) % 240000; // Ciclo de 4 min
        
        // Spawn de inimigos
        const spawnRate = CONFIG.ENEMY_SPAWN_RATE / (1 + room.wave * 0.2);
        if(Date.now() - room.lastSpawn > spawnRate) {
            room.lastSpawn = Date.now();
            spawnEnemy(room);
        }
        
        // Sistema de Waves
        if(Date.now() - room.lastWave > CONFIG.WAVE_INTERVAL) {
            room.lastWave = Date.now();
            room.wave++;
            io.to(code).emit('newWave', { wave: room.wave });
            
            // Spawn wave
            const spawnCount = 3 + room.wave * 2;
            for(let i = 0; i < spawnCount; i++) {
                setTimeout(() => spawnEnemy(room), i * 300);
            }
        }
        
        // AI dos inimigos
        room.enemies.forEach(e => {
            if(e.dead) return;
            
            // Encontrar jogador mais próximo
            let closest = null;
            let minDist = 600;
            
            for(const id in room.players) {
                const p = room.players[id];
                if(p.dead) continue;
                const d = Math.hypot(p.x - e.x, p.y - e.y);
                if(d < minDist) {
                    minDist = d;
                    closest = p;
                }
            }
            
            if(closest) {
                e.state = 'chase';
                e.target = closest.id;
                
                // Movimento em direção ao jogador
                const angle = Math.atan2(closest.y - e.y, closest.x - e.x);
                e.x += Math.cos(angle) * e.speed;
                e.y += Math.sin(angle) * e.speed;
                e.facing = Math.cos(angle) > 0 ? 1 : -1;
                
                // Manter dentro do mapa
                e.x = Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, e.x));
                e.y = Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, e.y));
                
                // FALAR FRASES AMEAÇADORAS
                e.speakCooldown--;
                if(e.speakCooldown <= 0 && minDist < 300 && Math.random() < 0.02) {
                    const quotes = ENEMY_QUOTES[e.type] || ["..."];
                    const quote = quotes[Math.floor(Math.random() * quotes.length)];
                    
                    if(quote !== e.lastSpoke) {
                        e.lastSpoke = quote;
                        e.speakCooldown = 100; // Cooldown entre falas
                        
                        io.to(code).emit('enemySpeak', {
                            id: e.id,
                            x: e.x,
                            y: e.y,
                            message: quote,
                            isBoss: e.isBoss
                        });
                    }
                }
                
                // Atacar jogador
                if(minDist < 45 && e.attackCooldown <= 0) {
                    closest.hp -= e.dmg;
                    e.attackCooldown = 40;
                    
                    io.to(code).emit('playerHit', {
                        id: closest.id,
                        dmg: e.dmg,
                        attackerId: e.id
                    });
                    
                    if(closest.hp <= 0) {
                        closest.dead = true;
                        io.to(code).emit('playerDeath', { 
                            id: closest.id, 
                            name: closest.name,
                            killedBy: e.type
                        });
                    }
                }
            } else {
                e.state = 'idle';
                // Movimento aleatório quando não tem alvo
                if(Math.random() < 0.02) {
                    const randomAngle = Math.random() * Math.PI * 2;
                    e.x += Math.cos(randomAngle) * e.speed * 10;
                    e.y += Math.sin(randomAngle) * e.speed * 10;
                    e.x = Math.max(100, Math.min(CONFIG.MAP_SIZE - 100, e.x));
                    e.y = Math.max(100, Math.min(CONFIG.MAP_SIZE - 100, e.y));
                }
            }
            
            if(e.attackCooldown > 0) e.attackCooldown--;
            
            // Colidir com spikes
            room.buildings.forEach(b => {
                if(b.type === 'spike') {
                    const dist = Math.hypot(b.x - e.x, b.y - e.y);
                    if(dist < 40) {
                        e.hp -= 5;
                        if(e.hp <= 0) e.dead = true;
                    }
                }
            });
        });
        
        // Torretas atiram
        room.buildings.forEach(b => {
            if(b.type === 'turret' && Date.now() - b.lastAction > 800) {
                let closest = null;
                let minDist = 280;
                
                room.enemies.forEach(e => {
                    if(e.dead) return;
                    const d = Math.hypot(e.x - b.x, e.y - b.y);
                    if(d < minDist) {
                        minDist = d;
                        closest = e;
                    }
                });
                
                if(closest) {
                    b.lastAction = Date.now();
                    closest.hp -= 25;
                    
                    io.to(code).emit('turretShot', {
                        fromX: b.x, fromY: b.y,
                        toX: closest.x, toY: closest.y
                    });
                    
                    if(closest.hp <= 0) {
                        closest.dead = true;
                        io.to(code).emit('enemyDeath', {
                            x: closest.x, y: closest.y,
                            type: closest.type,
                            isBoss: closest.isBoss
                        });
                    }
                }
            }
            
            // Healing station
            if(b.type === 'healing' && Date.now() - b.lastAction > 2000) {
                for(const id in room.players) {
                    const p = room.players[id];
                    if(p.dead) continue;
                    const dist = Math.hypot(p.x - b.x, p.y - b.y);
                    if(dist < 100 && p.hp < p.maxHp) {
                        p.hp = Math.min(p.maxHp, p.hp + 5);
                        b.lastAction = Date.now();
                        io.to(code).emit('healingPulse', { x: b.x, y: b.y });
                    }
                }
            }
        });
        
        // Limpar mortos
        room.enemies = room.enemies.filter(e => !e.dead);
        
        // Enviar update
        io.to(code).emit('gameUpdate', {
            players: room.players,
            enemies: room.enemies,
            resources: room.resources,
            buildings: room.buildings,
            orbs: room.orbs,
            wave: room.wave,
            time: room.time,
            code: code
        });
    }
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  🎮 RPG LEGENDS V8 - MIKU EDITION 💙   ║
║  Servidor rodando na porta ${PORT}          ║
╚════════════════════════════════════════╝
    `);
});
