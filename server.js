const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: { origin: "*" },
    pingInterval: 2000,
    pingTimeout: 5000
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// ============ CONFIGURAÇÕES ============
const CONFIG = {
    MAP_SIZE: 2400,
    TILE_SIZE: 50,
    PLAYER_SPEED: 4,
    ATTACK_COOLDOWN: 300,
    ZOMBIE_SPAWN_RATE: 3000,
    MAX_ZOMBIES: 30,
    WAVE_DURATION: 60000,
    WALL_SIZE: 40,
    BANANA_SLIP_DURATION: 2000,
    TREE_RESPAWN_TIME: 45000,
    BUILD_RANGE: 100
};

// ============ TIPOS DE ZUMBIS ============
const ZOMBIE_TYPES = {
    normal: {
        hp: 30,
        damage: 8,
        speed: 1.2,
        xp: 15,
        color: '#4A5F4A',
        size: 20,
        coins: 5
    },
    fast: {
        hp: 20,
        damage: 6,
        speed: 2.5,
        xp: 20,
        color: '#6B8E6B',
        size: 18,
        coins: 8
    },
    tank: {
        hp: 80,
        damage: 15,
        speed: 0.8,
        xp: 40,
        color: '#2C3E2C',
        size: 28,
        coins: 15
    },
    spitter: {
        hp: 25,
        damage: 10,
        speed: 1.5,
        xp: 25,
        color: '#5F7F5F',
        size: 20,
        coins: 10,
        ranged: true
    },
    boss: {
        hp: 200,
        damage: 25,
        speed: 1.0,
        xp: 100,
        color: '#1A2E1A',
        size: 40,
        coins: 50
    }
};

// ============ CUSTOS DE CONSTRUÇÃO ============
const BUILD_COSTS = {
    wall: { wood: 5, stone: 2, hp: 100 },
    spike: { wood: 3, stone: 5, hp: 50, damage: 5 },
    turret: { wood: 10, stone: 8, coins: 10, hp: 80, damage: 10, range: 150 },
    campfire: { wood: 8, stone: 3, hp: 60 },
    chest: { wood: 15, stone: 5, hp: 120 },
    banana: { wood: 0, stone: 0, coins: 3 }
};

// ============ LISTA DE SERVIDORES ============
const publicServers = {};

// ============ FUNÇÕES AUXILIARES ============
function createServer(name, maxPlayers) {
    const serverId = 'server_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    publicServers[serverId] = {
        id: serverId,
        name: name,
        players: {},
        maxPlayers: maxPlayers || 8,
        zombies: [],
        resources: generateResources(),
        buildings: [],
        projectiles: [],
        items: [],
        orbs: [],
        effects: [],
        wave: 1,
        waveTimer: Date.now(),
        zombieSpawnTimer: Date.now(),
        gameTime: 0,
        createdAt: Date.now(),
        public: true
    };
    
    return serverId;
}

function generateResources() {
    const resources = [];
    
    // Árvores
    for (let i = 0; i < 100; i++) {
        resources.push({
            id: 'tree_' + i + '_' + Date.now(),
            type: 'tree',
            x: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            y: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            hp: 30,
            maxHp: 30,
            wood: 8 + Math.floor(Math.random() * 5),
            depleted: false,
            respawnTime: 0
        });
    }
    
    // Pedras
    for (let i = 0; i < 60; i++) {
        resources.push({
            id: 'stone_' + i + '_' + Date.now(),
            type: 'stone',
            x: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            y: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            hp: 40,
            maxHp: 40,
            stone: 6 + Math.floor(Math.random() * 4),
            depleted: false,
            respawnTime: 0
        });
    }
    
    // Arbustos (comida)
    for (let i = 0; i < 40; i++) {
        resources.push({
            id: 'bush_' + i + '_' + Date.now(),
            type: 'bush',
            x: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            y: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            hp: 10,
            maxHp: 10,
            food: 2 + Math.floor(Math.random() * 2),
            depleted: false,
            respawnTime: 0
        });
    }
    
    return resources;
}

function createPlayer(name, color) {
    return {
        name: name || 'Sobrevivente',
        x: CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200,
        y: CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0,
        hp: 100,
        maxHp: 100,
        level: 1,
        xp: 0,
        nextXp: 100,
        wood: 20,
        stone: 10,
        food: 5,
        coins: 10,
        speed: CONFIG.PLAYER_SPEED,
        damage: 10,
        defense: 0,
        state: 'idle',
        facing: 1,
        attackCooldown: 0,
        buildCooldown: 0,
        color: color || { r: 100, g: 150, b: 200 },
        inventory: Array(27).fill(null),
        hotbar: Array(9).fill(null),
        selectedSlot: 0,
        kills: 0,
        constructions: 0,
        alive: true
    };
}

function createZombie(server, type) {
    const zombieType = ZOMBIE_TYPES[type] || ZOMBIE_TYPES.normal;
    const waveMultiplier = 1 + (server.wave - 1) * 0.2;
    
    // Spawn longe dos players
    let x, y;
    let attempts = 0;
    do {
        x = 50 + Math.random() * (CONFIG.MAP_SIZE - 100);
        y = 50 + Math.random() * (CONFIG.MAP_SIZE - 100);
        attempts++;
    } while(attempts < 10 && isNearPlayers(x, y, server, 200));
    
    return {
        id: 'zombie_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: type,
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        hp: Math.floor(zombieType.hp * waveMultiplier),
        maxHp: Math.floor(zombieType.hp * waveMultiplier),
        damage: Math.floor(zombieType.damage * waveMultiplier),
        speed: zombieType.speed,
        xp: zombieType.xp,
        coins: zombieType.coins,
        size: zombieType.size,
        color: zombieType.color,
        target: null,
        attackCooldown: 0,
        state: 'wander',
        wanderAngle: Math.random() * Math.PI * 2,
        stunned: 0,
        slipping: false,
        slipTime: 0,
        pathfinding: [],
        lastPathUpdate: 0
    };
}

function isNearPlayers(x, y, server, distance) {
    for (const playerId in server.players) {
        const player = server.players[playerId];
        const dist = Math.hypot(player.x - x, player.y - y);
        if (dist < distance) return true;
    }
    return false;
}

function checkCollisionWithWalls(x, y, size, server) {
    for (const building of server.buildings) {
        if (building.type === 'wall' || building.type === 'chest') {
            const dx = Math.abs(x - building.x);
            const dy = Math.abs(y - building.y);
            
            if (dx < (CONFIG.WALL_SIZE/2 + size) && dy < (CONFIG.WALL_SIZE/2 + size)) {
                return true;
            }
        }
    }
    return false;
}

function findPath(zombie, targetX, targetY, server) {
    // Simples pathfinding - evitar walls
    const angle = Math.atan2(targetY - zombie.y, targetX - zombie.x);
    let moveX = Math.cos(angle) * zombie.speed;
    let moveY = Math.sin(angle) * zombie.speed;
    
    // Checar colisão à frente
    const nextX = zombie.x + moveX * 5;
    const nextY = zombie.y + moveY * 5;
    
    if (checkCollisionWithWalls(nextX, nextY, zombie.size, server)) {
        // Tentar contornar
        const leftAngle = angle - Math.PI / 3;
        const rightAngle = angle + Math.PI / 3;
        
        const leftX = zombie.x + Math.cos(leftAngle) * zombie.speed * 5;
        const leftY = zombie.y + Math.sin(leftAngle) * zombie.speed * 5;
        
        if (!checkCollisionWithWalls(leftX, leftY, zombie.size, server)) {
            moveX = Math.cos(leftAngle) * zombie.speed;
            moveY = Math.sin(leftAngle) * zombie.speed;
        } else {
            moveX = Math.cos(rightAngle) * zombie.speed;
            moveY = Math.sin(rightAngle) * zombie.speed;
        }
    }
    
    return { moveX, moveY };
}

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
    console.log('🎮 Jogador conectado:', socket.id);
    
    // Listar servidores disponíveis
    socket.on('getServers', () => {
        const serverList = Object.values(publicServers).map(s => ({
            id: s.id,
            name: s.name,
            players: Object.keys(s.players).length,
            maxPlayers: s.maxPlayers,
            wave: s.wave
        }));
        
        socket.emit('serverList', serverList);
    });
    
    // Criar servidor
    socket.on('createServer', (data) => {
        const serverId = createServer(data.name || 'Servidor Zumbi', data.maxPlayers || 8);
        const server = publicServers[serverId];
        
        server.players[socket.id] = createPlayer(data.playerName, data.color);
        socket.join(serverId);
        socket.serverId = serverId;
        
        socket.emit('joinedServer', {
            serverId: serverId,
            playerId: socket.id,
            serverName: server.name
        });
        
        console.log('✅ Servidor criado:', serverId);
    });
    
    // Entrar em servidor
    socket.on('joinServer', (data) => {
        const server = publicServers[data.serverId];
        
        if (!server) {
            socket.emit('error', { message: 'Servidor não encontrado!' });
            return;
        }
        
        if (Object.keys(server.players).length >= server.maxPlayers) {
            socket.emit('error', { message: 'Servidor cheio!' });
            return;
        }
        
        server.players[socket.id] = createPlayer(data.playerName, data.color);
        socket.join(data.serverId);
        socket.serverId = data.serverId;
        
        socket.emit('joinedServer', {
            serverId: data.serverId,
            playerId: socket.id,
            serverName: server.name
        });
        
        // Notificar outros jogadores
        socket.to(data.serverId).emit('playerJoined', {
            id: socket.id,
            name: data.playerName
        });
        
        console.log('✅ Jogador entrou no servidor:', data.serverId);
    });
    
    // Atualização do jogador
    socket.on('playerUpdate', (data) => {
        const server = publicServers[socket.serverId];
        if (!server || !server.players[socket.id]) return;
        
        const player = server.players[socket.id];
        
        if (typeof data.x === 'number' && typeof data.y === 'number') {
            // Verificar colisão com walls
            if (!checkCollisionWithWalls(data.x, data.y, 15, server)) {
                player.x = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, data.x));
                player.y = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, data.y));
            }
        }
        
        if (data.state) player.state = data.state;
        if (typeof data.facing === 'number') player.facing = data.facing;
        if (typeof data.selectedSlot === 'number') player.selectedSlot = data.selectedSlot;
    });
    
    // Ataque
    socket.on('playerAttack', (data) => {
        const server = publicServers[socket.serverId];
        if (!server || !server.players[socket.id]) return;
        
        const player = server.players[socket.id];
        const now = Date.now();
        
        if (player.attackCooldown > now || player.hp <= 0) return;
        
        player.attackCooldown = now + CONFIG.ATTACK_COOLDOWN;
        player.state = 'attack';
        
        const angle = data.angle || 0;
        const attackRange = 80;
        
        // Atacar zumbis
        server.zombies.forEach(zombie => {
            const dist = Math.hypot(zombie.x - player.x, zombie.y - player.y);
            const angleToZombie = Math.atan2(zombie.y - player.y, zombie.x - player.x);
            const angleDiff = Math.abs(angle - angleToZombie);
            
            if (dist < attackRange && (angleDiff < 0.8 || angleDiff > Math.PI * 2 - 0.8)) {
                const damage = player.damage + Math.floor(Math.random() * 5);
                zombie.hp -= damage;
                zombie.stunned = 200;
                
                // Knockback
                zombie.x += Math.cos(angleToZombie) * 20;
                zombie.y += Math.sin(angleToZombie) * 20;
                
                server.effects.push({
                    type: 'hit',
                    x: zombie.x,
                    y: zombie.y,
                    damage: damage,
                    color: '#FFD700'
                });
                
                if (zombie.hp <= 0) {
                    player.kills++;
                    player.xp += zombie.xp;
                    player.coins += zombie.coins;
                    
                    // Level up
                    while (player.xp >= player.nextXp) {
                        player.xp -= player.nextXp;
                        player.level++;
                        player.nextXp = Math.floor(player.nextXp * 1.5);
                        player.maxHp += 20;
                        player.hp = player.maxHp;
                        player.damage += 3;
                        
                        io.to(socket.id).emit('levelUp', {
                            level: player.level,
                            rewards: {
                                hp: 20,
                                damage: 3
                            }
                        });
                    }
                    
                    // Drop orbs
                    for (let i = 0; i < 3; i++) {
                        server.orbs.push({
                            id: 'orb_' + Date.now() + '_' + i,
                            x: zombie.x + (Math.random() - 0.5) * 30,
                            y: zombie.y + (Math.random() - 0.5) * 30,
                            type: Math.random() < 0.3 ? 'coin' : 'xp',
                            value: zombie.type === 'boss' ? 10 : 3
                        });
                    }
                }
            }
        });
        
        // Atacar recursos
        server.resources.forEach(resource => {
            if (resource.depleted) return;
            
            const dist = Math.hypot(resource.x - player.x, resource.y - player.y);
            if (dist < 60) {
                resource.hp -= 10;
                
                server.effects.push({
                    type: 'resourceHit',
                    x: resource.x,
                    y: resource.y
                });
                
                if (resource.hp <= 0) {
                    resource.depleted = true;
                    resource.respawnTime = Date.now() + CONFIG.TREE_RESPAWN_TIME;
                    
                    // Dar recursos
                    if (resource.type === 'tree') {
                        player.wood += resource.wood;
                        socket.emit('resourceCollected', {
                            type: 'wood',
                            amount: resource.wood
                        });
                    } else if (resource.type === 'stone') {
                        player.stone += resource.stone;
                        socket.emit('resourceCollected', {
                            type: 'stone',
                            amount: resource.stone
                        });
                    } else if (resource.type === 'bush') {
                        player.food += resource.food;
                        socket.emit('resourceCollected', {
                            type: 'food',
                            amount: resource.food
                        });
                    }
                }
            }
        });
    });
    
    // Construir
    socket.on('build', (data) => {
        const server = publicServers[socket.serverId];
        if (!server || !server.players[socket.id]) return;
        
        const player = server.players[socket.id];
        const cost = BUILD_COSTS[data.type];
        
        if (!cost) return;
        
        // Verificar distância
        const dist = Math.hypot(data.x - player.x, data.y - player.y);
        if (dist > CONFIG.BUILD_RANGE) {
            socket.emit('error', { message: 'Muito longe!' });
            return;
        }
        
        // Verificar recursos
        const hasResources = 
            player.wood >= (cost.wood || 0) &&
            player.stone >= (cost.stone || 0) &&
            player.coins >= (cost.coins || 0);
            
        if (!hasResources) {
            socket.emit('error', { message: 'Recursos insuficientes!' });
            return;
        }
        
        // Verificar espaço
        const tooClose = server.buildings.some(b => 
            Math.hypot(b.x - data.x, b.y - data.y) < 40
        );
        
        if (tooClose && data.type !== 'banana') {
            socket.emit('error', { message: 'Muito perto de outra construção!' });
            return;
        }
        
        // Item especial: Banana
        if (data.type === 'banana') {
            server.items.push({
                id: 'banana_' + Date.now(),
                type: 'banana',
                x: data.x,
                y: data.y,
                owner: socket.id,
                lifetime: 30000
            });
            
            player.coins -= cost.coins;
            socket.emit('buildSuccess', { type: 'banana' });
            return;
        }
        
        // Construir
        player.wood -= cost.wood || 0;
        player.stone -= cost.stone || 0;
        player.coins -= cost.coins || 0;
        player.constructions++;
        
        const building = {
            id: 'build_' + Date.now(),
            type: data.type,
            x: data.x,
            y: data.y,
            hp: cost.hp,
            maxHp: cost.hp,
            owner: socket.id,
            damage: cost.damage || 0,
            range: cost.range || 0,
            lastAction: 0
        };
        
        server.buildings.push(building);
        socket.emit('buildSuccess', { type: data.type });
    });
    
    // Usar item
    socket.on('useItem', (data) => {
        const server = publicServers[socket.serverId];
        if (!server || !server.players[socket.id]) return;
        
        const player = server.players[socket.id];
        
        if (data.type === 'food' && player.food > 0 && player.hp < player.maxHp) {
            player.food--;
            player.hp = Math.min(player.maxHp, player.hp + 30);
            
            server.effects.push({
                type: 'heal',
                x: player.x,
                y: player.y,
                amount: 30
            });
        }
    });
    
    // Coletar orb
    socket.on('collectOrb', (orbId) => {
        const server = publicServers[socket.serverId];
        if (!server || !server.players[socket.id]) return;
        
        const player = server.players[socket.id];
        const orbIndex = server.orbs.findIndex(o => o.id === orbId);
        
        if (orbIndex !== -1) {
            const orb = server.orbs[orbIndex];
            const dist = Math.hypot(orb.x - player.x, orb.y - player.y);
            
            if (dist < 30) {
                if (orb.type === 'coin') {
                    player.coins += orb.value;
                } else {
                    player.xp += orb.value;
                }
                
                server.orbs.splice(orbIndex, 1);
            }
        }
    });
    
    // Respawn
    socket.on('respawn', () => {
        const server = publicServers[socket.serverId];
        if (!server || !server.players[socket.id]) return;
        
        const player = server.players[socket.id];
        player.hp = player.maxHp;
        player.x = CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200;
        player.y = CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200;
        player.alive = true;
        
        // Penalidade
        player.wood = Math.floor(player.wood * 0.7);
        player.stone = Math.floor(player.stone * 0.7);
        player.coins = Math.floor(player.coins * 0.5);
    });
    
    // Chat
    socket.on('chatMessage', (message) => {
        const server = publicServers[socket.serverId];
        if (!server || !server.players[socket.id]) return;
        
        io.to(socket.serverId).emit('chatMessage', {
            player: server.players[socket.id].name,
            message: message.substring(0, 100)
        });
    });
    
    // Desconexão
    socket.on('disconnect', () => {
        console.log('👋 Jogador desconectado:', socket.id);
        
        if (socket.serverId && publicServers[socket.serverId]) {
            const server = publicServers[socket.serverId];
            delete server.players[socket.id];
            
            // Remover construções do jogador
            server.buildings = server.buildings.filter(b => b.owner !== socket.id);
            
            // Deletar servidor se vazio
            if (Object.keys(server.players).length === 0) {
                delete publicServers[socket.serverId];
                console.log('🗑️ Servidor removido:', socket.serverId);
            }
        }
    });
});

// ============ GAME LOOP ============
setInterval(() => {
    const now = Date.now();
    
    for (const serverId in publicServers) {
        const server = publicServers[serverId];
        
        // ===== SPAWN DE ZUMBIS =====
        if (now - server.zombieSpawnTimer > CONFIG.ZOMBIE_SPAWN_RATE) {
            server.zombieSpawnTimer = now;
            
            if (server.zombies.length < CONFIG.MAX_ZOMBIES) {
                // Escolher tipo baseado na wave
                const types = ['normal', 'normal', 'fast'];
                if (server.wave > 2) types.push('tank');
                if (server.wave > 4) types.push('spitter');
                if (server.wave % 5 === 0) types.push('boss');
                
                const type = types[Math.floor(Math.random() * types.length)];
                server.zombies.push(createZombie(server, type));
            }
        }
        
        // ===== SISTEMA DE WAVES =====
        if (now - server.waveTimer > CONFIG.WAVE_DURATION) {
            server.waveTimer = now;
            server.wave++;
            
            // Spawn em massa
            const spawnCount = Math.min(5 + server.wave * 2, 20);
            for (let i = 0; i < spawnCount; i++) {
                setTimeout(() => {
                    if (server.zombies.length < CONFIG.MAX_ZOMBIES + 10) {
                        const type = Math.random() < 0.1 ? 'tank' : 'normal';
                        server.zombies.push(createZombie(server, type));
                    }
                }, i * 200);
            }
            
            io.to(serverId).emit('newWave', { wave: server.wave });
        }
        
        // ===== ATUALIZAR ZUMBIS =====
        server.zombies = server.zombies.filter(zombie => {
            if (zombie.hp <= 0) return false;
            
            // Cooldowns
            if (zombie.attackCooldown > 0) zombie.attackCooldown -= 16;
            if (zombie.stunned > 0) {
                zombie.stunned -= 16;
                return true;
            }
            
            // Verificar se está escorregando na banana
            if (zombie.slipping) {
                zombie.slipTime -= 16;
                if (zombie.slipTime <= 0) {
                    zombie.slipping = false;
                } else {
                    // Continuar escorregando
                    zombie.x += zombie.vx;
                    zombie.y += zombie.vy;
                    
                    // Desacelerar
                    zombie.vx *= 0.95;
                    zombie.vy *= 0.95;
                    
                    // Manter dentro do mapa
                    zombie.x = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, zombie.x));
                    zombie.y = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, zombie.y));
                    return true;
                }
            }
            
            // Verificar bananas no chão
            for (const item of server.items) {
                if (item.type === 'banana') {
                    const dist = Math.hypot(item.x - zombie.x, item.y - zombie.y);
                    if (dist < 20 && !zombie.slipping) {
                        // Escorregar!
                        zombie.slipping = true;
                        zombie.slipTime = CONFIG.BANANA_SLIP_DURATION;
                        zombie.vx = (Math.random() - 0.5) * 10;
                        zombie.vy = (Math.random() - 0.5) * 10;
                        
                        server.effects.push({
                            type: 'slip',
                            x: zombie.x,
                            y: zombie.y,
                            text: 'SLIP!'
                        });
                        
                        // Remover banana
                        const itemIndex = server.items.indexOf(item);
                        if (itemIndex !== -1) {
                            server.items.splice(itemIndex, 1);
                        }
                    }
                }
            }
            
            // IA do zumbi
            let closestPlayer = null;
            let closestDist = Infinity;
            
            for (const playerId in server.players) {
                const player = server.players[playerId];
                if (player.hp <= 0) continue;
                
                const dist = Math.hypot(player.x - zombie.x, player.y - zombie.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestPlayer = player;
                }
            }
            
            if (closestPlayer && closestDist < 300) {
                zombie.state = 'chase';
                zombie.target = closestPlayer;
                
                // Pathfinding simples
                const path = findPath(zombie, closestPlayer.x, closestPlayer.y, server);
                
                zombie.x += path.moveX;
                zombie.y += path.moveY;
                
                // Manter dentro do mapa
                zombie.x = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, zombie.x));
                zombie.y = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, zombie.y));
                
                // Atacar se perto
                if (closestDist < 40 && zombie.attackCooldown <= 0) {
                    closestPlayer.hp -= zombie.damage;
                    zombie.attackCooldown = 1000;
                    
                    server.effects.push({
                        type: 'playerHit',
                        x: closestPlayer.x,
                        y: closestPlayer.y,
                        damage: zombie.damage
                    });
                    
                    if (closestPlayer.hp <= 0) {
                        closestPlayer.alive = false;
                        io.to(serverId).emit('playerDied', {
                            playerId: Object.keys(server.players).find(id => 
                                server.players[id] === closestPlayer
                            )
                        });
                    }
                }
            } else {
                zombie.state = 'wander';
                
                if (Math.random() < 0.02) {
                    zombie.wanderAngle = Math.random() * Math.PI * 2;
                }
                
                const moveX = Math.cos(zombie.wanderAngle) * zombie.speed * 0.5;
                const moveY = Math.sin(zombie.wanderAngle) * zombie.speed * 0.5;
                
                if (!checkCollisionWithWalls(zombie.x + moveX, zombie.y + moveY, zombie.size, server)) {
                    zombie.x += moveX;
                    zombie.y += moveY;
                }
                
                zombie.x = Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, zombie.x));
                zombie.y = Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, zombie.y));
            }
            
            return true;
        });
        
        // ===== ATUALIZAR CONSTRUÇÕES =====
        server.buildings = server.buildings.filter(building => {
            if (building.hp <= 0) return false;
            
            // Torreta atira
            if (building.type === 'turret' && now - building.lastAction > 500) {
                const target = server.zombies.find(z => 
                    Math.hypot(z.x - building.x, z.y - building.y) < building.range
                );
                
                if (target) {
                    building.lastAction = now;
                    target.hp -= building.damage;
                    
                    server.projectiles.push({
                        id: 'proj_' + Date.now(),
                        type: 'bullet',
                        x: building.x,
                        y: building.y,
                        targetX: target.x,
                        targetY: target.y,
                        lifetime: 10
                    });
                    
                    server.effects.push({
                        type: 'turretShoot',
                        x: building.x,
                        y: building.y
                    });
                }
            }
            
            // Espinhos dão dano
            if (building.type === 'spike') {
                server.zombies.forEach(zombie => {
                    const dist = Math.hypot(zombie.x - building.x, zombie.y - building.y);
                    if (dist < 30 && now - building.lastAction > 500) {
                        building.lastAction = now;
                        zombie.hp -= building.damage;
                        zombie.stunned = 300;
                        
                        server.effects.push({
                            type: 'spikeDamage',
                            x: zombie.x,
                            y: zombie.y,
                            damage: building.damage
                        });
                    }
                });
            }
            
            // Fogueira cura
            if (building.type === 'campfire') {
                for (const playerId in server.players) {
                    const player = server.players[playerId];
                    const dist = Math.hypot(player.x - building.x, player.y - building.y);
                    
                    if (dist < 60 && player.hp < player.maxHp && now - building.lastAction > 2000) {
                        building.lastAction = now;
                        player.hp = Math.min(player.maxHp, player.hp + 5);
                        
                        server.effects.push({
                            type: 'campfireHeal',
                            x: player.x,
                            y: player.y,
                            amount: 5
                        });
                    }
                }
            }
            
            // Zumbis atacam construções
            server.zombies.forEach(zombie => {
                const dist = Math.hypot(zombie.x - building.x, zombie.y - building.y);
                if (dist < 40 && zombie.attackCooldown <= 0) {
                    zombie.attackCooldown = 1000;
                    building.hp -= zombie.damage / 2;
                    
                    server.effects.push({
                        type: 'buildingDamage',
                        x: building.x,
                        y: building.y,
                        damage: zombie.damage / 2
                    });
                }
            });
            
            return true;
        });
        
        // ===== RESPAWN DE RECURSOS =====
        server.resources.forEach(resource => {
            if (resource.depleted && now > resource.respawnTime) {
                resource.depleted = false;
                resource.hp = resource.maxHp;
            }
        });
        
        // ===== LIMPAR ITEMS ANTIGOS =====
        server.items = server.items.filter(item => {
            return now - item.lifetime < 30000; // 30 segundos
        });
        
        // ===== LIMPAR PROJÉTEIS =====
        server.projectiles = server.projectiles.filter(p => {
            p.lifetime--;
            return p.lifetime > 0;
        });
        
        // ===== LIMPAR ORBS =====
        server.orbs = server.orbs.filter(orb => {
            return now - (orb.createdAt || now) < 30000; // 30 segundos
        });
        
        // ===== LIMPAR EFEITOS =====
        server.effects = server.effects.filter(e => {
            return now - (e.createdAt || now) < 2000; // 2 segundos
        });
        
        // ===== ENVIAR ESTADO DO JOGO =====
        const gameState = {
            players: server.players,
            zombies: server.zombies,
            resources: server.resources.filter(r => !r.depleted).map(r => ({
                id: r.id,
                type: r.type,
                x: r.x,
                y: r.y,
                hp: r.hp,
                maxHp: r.maxHp
            })),
            buildings: server.buildings,
            items: server.items,
            projectiles: server.projectiles,
            orbs: server.orbs,
            effects: server.effects,
            wave: server.wave,
            gameTime: server.gameTime
        };
        
        io.to(serverId).emit('gameState', gameState);
        
        // Limpar efeitos após enviar
        server.effects = [];
    }
}, 16); // ~60 FPS

// ============ INICIAR SERVIDOR ============
server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   🧟 ZOMBIE SURVIVAL - SERVER ONLINE      ║
║   🌐 Porta: ${PORT}                           ║
║   ✨ Versão: 2.0.0                       ║
╚═══════════════════════════════════════════╝
    `);
});
