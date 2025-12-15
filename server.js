const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// Armazenamento de salas
const rooms = {};

// Configurações do jogo
const CONFIG = {
    MAP_SIZE: 2400,
    PLAYER_SPEED: 5,
    ENEMY_SPAWN_RATE: 3000,
    RESOURCE_RESPAWN: 30000,
    WAVE_DURATION: 60000
};

// Frases dos inimigos
const ENEMY_QUOTES = {
    slime: ["Blurp!", "Vou te grudar!", "Gelatinoso...", "Splash!"],
    goblin: ["Hehe!", "Meu tesouro!", "Pega ele!", "Grrrr!"],
    skeleton: ["Ossos...", "Morte!", "Clack clack!", "Você será um de nós!"],
    demon: ["Queime!", "Sua alma é minha!", "HAHAHA!", "Inferno!"],
    ghost: ["Buuu~", "Frio...", "Venha...", "Eternidade..."]
};

// Função para gerar código único de sala
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Criar jogador
function createPlayer(name) {
    return {
        name: name || 'Miku',
        x: CONFIG.MAP_SIZE / 2,
        y: CONFIG.MAP_SIZE / 2,
        hp: 100,
        maxHp: 100,
        level: 1,
        xp: 0,
        nextXp: 100,
        wood: 0,
        stone: 0,
        crystal: 0,
        food: 3,
        speed: CONFIG.PLAYER_SPEED,
        damage: 10,
        state: 'idle',
        angle: 0,
        facing: 1,
        upgrades: []
    };
}

// Gerar recursos
function generateResources() {
    const resources = [];
    
    for(let i = 0; i < 100; i++) {
        resources.push({
            id: 'res_' + i,
            type: Math.random() > 0.5 ? 'tree' : 'stone',
            x: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            y: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            hp: 30,
            maxHp: 30
        });
    }
    
    // Adicionar cristais especiais
    for(let i = 0; i < 20; i++) {
        resources.push({
            id: 'crystal_' + i,
            type: 'crystal',
            x: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            y: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            hp: 50,
            maxHp: 50
        });
    }
    
    return resources;
}

// Criar inimigo
function createEnemy(wave = 1) {
    const types = ['slime'];
    if(wave >= 2) types.push('goblin');
    if(wave >= 3) types.push('skeleton');
    if(wave >= 4) types.push('ghost');
    if(wave >= 5) types.push('demon');
    
    const type = types[Math.floor(Math.random() * types.length)];
    const isBoss = Math.random() < 0.1 * wave;
    
    const stats = {
        slime: { hp: 30, damage: 5, speed: 1.5, xp: 10 },
        goblin: { hp: 50, damage: 8, speed: 2, xp: 20 },
        skeleton: { hp: 70, damage: 12, speed: 1.8, xp: 30 },
        ghost: { hp: 40, damage: 10, speed: 2.5, xp: 25 },
        demon: { hp: 100, damage: 20, speed: 1.5, xp: 50 }
    };
    
    const s = stats[type];
    const multiplier = 1 + (wave - 1) * 0.2;
    
    return {
        id: 'enemy_' + Date.now() + '_' + Math.random(),
        type: type,
        x: Math.random() * CONFIG.MAP_SIZE,
        y: Math.random() * CONFIG.MAP_SIZE,
        hp: s.hp * multiplier * (isBoss ? 3 : 1),
        maxHp: s.hp * multiplier * (isBoss ? 3 : 1),
        damage: s.damage * multiplier * (isBoss ? 2 : 1),
        speed: s.speed * (isBoss ? 0.7 : 1),
        xp: s.xp * multiplier * (isBoss ? 5 : 1),
        isBoss: isBoss,
        target: null,
        lastSpeak: 0
    };
}

// Socket.io eventos
io.on('connection', (socket) => {
    console.log('Player conectado:', socket.id);
    
    // Criar sala
    socket.on('createRoom', (playerName) => {
        const roomCode = generateRoomCode();
        
        rooms[roomCode] = {
            code: roomCode,
            players: {},
            enemies: [],
            resources: generateResources(),
            buildings: [],
            projectiles: [],
            orbs: [],
            wave: 1,
            lastEnemySpawn: Date.now(),
            lastWaveTime: Date.now()
        };
        
        rooms[roomCode].players[socket.id] = createPlayer(playerName);
        socket.join(roomCode);
        socket.roomCode = roomCode;
        
        socket.emit('roomJoined', { 
            roomCode: roomCode,
            playerId: socket.id 
        });
        
        console.log('Sala criada:', roomCode);
    });
    
    // Entrar na sala
    socket.on('joinRoom', ({ code, name }) => {
        const roomCode = code.toUpperCase();
        
        if(rooms[roomCode]) {
            rooms[roomCode].players[socket.id] = createPlayer(name);
            socket.join(roomCode);
            socket.roomCode = roomCode;
            
            socket.emit('roomJoined', { 
                roomCode: roomCode,
                playerId: socket.id 
            });
            
            console.log('Player entrou na sala:', roomCode);
        } else {
            socket.emit('error', 'Sala não encontrada!');
        }
    });
    
    // Movimento do player
    socket.on('playerMove', (data) => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        player.x = Math.max(0, Math.min(CONFIG.MAP_SIZE, data.x));
        player.y = Math.max(0, Math.min(CONFIG.MAP_SIZE, data.y));
        player.state = data.state;
        player.angle = data.angle;
        player.facing = data.facing;
        
        // Coletar orbs
        room.orbs = room.orbs.filter(orb => {
            const dist = Math.hypot(orb.x - player.x, orb.y - player.y);
            if(dist < 30) {
                player.xp += orb.value;
                // Level up
                if(player.xp >= player.nextXp) {
                    player.level++;
                    player.xp -= player.nextXp;
                    player.nextXp = Math.floor(player.nextXp * 1.5);
                    player.maxHp += 20;
                    player.hp = player.maxHp;
                    socket.emit('levelUp', player.level);
                }
                return false;
            }
            return true;
        });
    });
    
    // Ataque
    socket.on('playerAttack', (data) => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        const angle = data.angle;
        
        // Atacar inimigos
        room.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            const angleDiff = Math.abs(angle - angleToEnemy);
            
            if(dist < 200 && angleDiff < 0.5) {
                const damage = player.damage * (1 + player.level * 0.1);
                enemy.hp -= damage;
                
                io.to(socket.roomCode).emit('hitEffect', {
                    x: enemy.x,
                    y: enemy.y,
                    damage: Math.floor(damage),
                    crit: Math.random() < 0.2
                });
                
                if(enemy.hp <= 0) {
                    // Drop orbs
                    for(let i = 0; i < 3; i++) {
                        room.orbs.push({
                            x: enemy.x + (Math.random() - 0.5) * 30,
                            y: enemy.y + (Math.random() - 0.5) * 30,
                            value: Math.floor(enemy.xp / 3)
                        });
                    }
                    
                    // Chance de drop de comida
                    if(Math.random() < 0.2) {
                        player.food++;
                    }
                    
                    // Remover inimigo
                    room.enemies = room.enemies.filter(e => e.id !== enemy.id);
                }
            }
        });
        
        // Atacar recursos
        room.resources.forEach(resource => {
            const dist = Math.hypot(resource.x - player.x, resource.y - player.y);
            
            if(dist < 100) {
                resource.hp -= 10;
                
                io.to(socket.roomCode).emit('resourceHit', {
                    id: resource.id,
                    hp: resource.hp,
                    maxHp: resource.maxHp
                });
                
                if(resource.hp <= 0) {
                    // Dar recursos ao player
                    if(resource.type === 'tree') {
                        player.wood += 3 + Math.floor(Math.random() * 3);
                    } else if(resource.type === 'stone') {
                        player.stone += 2 + Math.floor(Math.random() * 2);
                    } else if(resource.type === 'crystal') {
                        player.crystal += 1 + Math.floor(Math.random() * 2);
                    }
                    
                    // Respawn do recurso após um tempo
                    setTimeout(() => {
                        resource.hp = resource.maxHp;
                    }, CONFIG.RESOURCE_RESPAWN);
                }
            }
        });
    });
    
    // Construir
    socket.on('build', (data) => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        const costs = {
            wall: { wood: 10, stone: 0, crystal: 0 },
            turret: { wood: 20, stone: 10, crystal: 2 },
            campfire: { wood: 15, stone: 5, crystal: 0 },
            spikes: { wood: 5, stone: 5, crystal: 0 }
        };
        
        const cost = costs[data.type];
        if(!cost) return;
        
        if(player.wood >= cost.wood && 
           player.stone >= cost.stone && 
           player.crystal >= cost.crystal) {
            
            player.wood -= cost.wood;
            player.stone -= cost.stone;
            player.crystal -= cost.crystal;
            
            room.buildings.push({
                type: data.type,
                x: player.x,
                y: player.y,
                hp: 100,
                owner: socket.id
            });
        }
    });
    
    // Usar comida
    socket.on('useFood', () => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        if(player.food > 0 && player.hp < player.maxHp) {
            player.food--;
            player.hp = Math.min(player.maxHp, player.hp + 30);
        }
    });
    
    // Escolher upgrade
    socket.on('chooseUpgrade', (upgrade) => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        player.upgrades.push(upgrade);
        
        // Aplicar upgrade
        switch(upgrade) {
            case 'damage':
                player.damage += 5;
                break;
            case 'health':
                player.maxHp += 30;
                player.hp = player.maxHp;
                break;
            case 'speed':
                player.speed += 2;
                break;
        }
    });
    
    // Respawn
    socket.on('respawn', () => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        player.hp = player.maxHp;
        player.x = CONFIG.MAP_SIZE / 2;
        player.y = CONFIG.MAP_SIZE / 2;
        player.wood = Math.floor(player.wood / 2);
        player.stone = Math.floor(player.stone / 2);
        player.crystal = 0;
    });
    
    // Desconectar
    socket.on('disconnect', () => {
        console.log('Player desconectado:', socket.id);
        
        if(socket.roomCode && rooms[socket.roomCode]) {
            delete rooms[socket.roomCode].players[socket.id];
            
            // Deletar sala se vazia
            if(Object.keys(rooms[socket.roomCode].players).length === 0) {
                delete rooms[socket.roomCode];
                console.log('Sala deletada:', socket.roomCode);
            }
        }
    });
});

// Game loop
setInterval(() => {
    for(const roomCode in rooms) {
        const room = rooms[roomCode];
        
        // Spawn de inimigos
        if(Date.now() - room.lastEnemySpawn > CONFIG.ENEMY_SPAWN_RATE) {
            room.lastEnemySpawn = Date.now();
            if(room.enemies.length < 30) {
                room.enemies.push(createEnemy(room.wave));
            }
        }
        
        // Sistema de waves
        if(Date.now() - room.lastWaveTime > CONFIG.WAVE_DURATION) {
            room.lastWaveTime = Date.now();
            room.wave++;
            
            // Spawn extra de inimigos na nova wave
            for(let i = 0; i < room.wave * 2; i++) {
                setTimeout(() => {
                    if(room.enemies.length < 50) {
                        room.enemies.push(createEnemy(room.wave));
                    }
                }, i * 500);
            }
            
            io.to(roomCode).emit('newWave', room.wave);
        }
        
        // IA dos inimigos
        room.enemies.forEach(enemy => {
            // Encontrar player mais próximo
            let closestPlayer = null;
            let closestDist = Infinity;
            
            for(const playerId in room.players) {
                const player = room.players[playerId];
                const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                
                if(dist < closestDist && player.hp > 0) {
                    closestDist = dist;
                    closestPlayer = player;
                    enemy.target = playerId;
                }
            }
            
            // Perseguir player
            if(closestPlayer && closestDist < 500) {
                const angle = Math.atan2(
                    closestPlayer.y - enemy.y,
                    closestPlayer.x - enemy.x
                );
                
                enemy.x += Math.cos(angle) * enemy.speed;
                enemy.y += Math.sin(angle) * enemy.speed;
                
                // Atacar se perto
                if(closestDist < 40) {
                    closestPlayer.hp -= enemy.damage;
                    
                    if(closestPlayer.hp <= 0) {
                        io.to(roomCode).emit('playerDied', enemy.target);
                    }
                }
                
                // Falar frases
                if(Date.now() - enemy.lastSpeak > 5000 && Math.random() < 0.1) {
                    enemy.lastSpeak = Date.now();
                    const quotes = ENEMY_QUOTES[enemy.type] || ["..."];
                    const quote = quotes[Math.floor(Math.random() * quotes.length)];
                    
                    io.to(roomCode).emit('enemySpeak', {
                        id: enemy.id,
                        message: quote,
                        x: enemy.x,
                        y: enemy.y
                    });
                }
            }
        });
        
        // Torretas automáticas
        room.buildings.forEach(building => {
            if(building.type === 'turret') {
                const nearbyEnemy = room.enemies.find(e => {
                    const dist = Math.hypot(e.x - building.x, e.y - building.y);
                    return dist < 200;
                });
                
                if(nearbyEnemy) {
                    nearbyEnemy.hp -= 5;
                    
                    io.to(roomCode).emit('turretShot', {
                        from: { x: building.x, y: building.y },
                        to: { x: nearbyEnemy.x, y: nearbyEnemy.y }
                    });
                    
                    if(nearbyEnemy.hp <= 0) {
                        room.enemies = room.enemies.filter(e => e.id !== nearbyEnemy.id);
                    }
                }
            }
        });
        
        // Enviar estado do jogo
        io.to(roomCode).emit('gameState', {
            players: room.players,
            enemies: room.enemies,
            resources: room.resources,
            buildings: room.buildings,
            orbs: room.orbs,
            wave: room.wave
        });
    }
}, 1000 / 60); // 60 FPS

server.listen(PORT, () => {
    console.log(`🎮 RPG Legends Miku Edition rodando na porta ${PORT}`);
});
