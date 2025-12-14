const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Estado das Salas
// Formato: { "ABCD": { socketId1: {x,y}, socketId2: {x,y} } }
const rooms = {};

// Função para gerar código de sala (4 letras)
function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Um jogador conectou:', socket.id);

  // 1. CRIAR SALA
  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    rooms[roomId] = {}; // Cria a sala vazia
    
    // Adiciona o player que criou na sala
    rooms[roomId][socket.id] = { x: 1200, y: 1200 };
    
    socket.join(roomId);
    socket.emit('roomCreated', roomId); // Avisa o criador qual é o código
    console.log(`Sala criada: ${roomId} por ${socket.id}`);
  });

  // 2. ENTRAR NA SALA
  socket.on('joinRoom', (roomId) => {
    // Verifica se a sala existe
    if (rooms[roomId]) {
      // Adiciona o player na sala
      rooms[roomId][socket.id] = { x: 1200, y: 1200 };
      
      socket.join(roomId);
      socket.emit('joinedRoom', roomId); // Confirmação (opcional mas bom)
      console.log(`${socket.id} entrou na sala ${roomId}`);
    } else {
      console.log(`Tentativa de entrar em sala inexistente: ${roomId}`);
    }
  });

  // 3. MOVIMENTAÇÃO
  socket.on('move', (data) => {
    // data = { roomId, x, y, state }
    const { roomId, x, y, state } = data;

    // Segurança básica: só atualiza se a sala e o player existirem
    if (rooms[roomId] && rooms[roomId][socket.id]) {
      rooms[roomId][socket.id].x = x;
      rooms[roomId][socket.id].y = y;
      // Se quiser passar o estado (run/attack), adicione ao objeto aqui
    }
  });

  // 4. DESCONEXÃO
  socket.on('disconnect', () => {
    console.log('Desconectou:', socket.id);
    
    // Procura em qual sala o player estava e remove
    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        delete rooms[roomId][socket.id];
        
        // Se a sala ficar vazia, deleta a sala para economizar memória
        if (Object.keys(rooms[roomId]).length === 0) {
          delete rooms[roomId];
        }
        break; 
      }
    }
  });
});

// Loop do Servidor (Broadcast de Posições)
// Envia o estado do mundo 20 vezes por segundo para todos na sala
setInterval(() => {
  for (const roomId in rooms) {
    const playersInRoom = rooms[roomId];
    // Envia APENAS para quem está nessa sala específica (roomId)
    io.to(roomId).emit('updatePlayers', playersInRoom);
  }
}, 50); // 50ms = 20 ticks por segundo

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
