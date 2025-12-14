const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');

// === CONFIGURAÇÃO CORRETA DE PASTAS ===
// Define que os arquivos do site estão na pasta 'public'
const pastaPublica = path.join(__dirname, 'public');
app.use(express.static(pastaPublica));

// Fallback: Se não achar na public, tenta na raiz também (segurança extra)
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  // Tenta enviar o arquivo que está dentro da pasta public
  res.sendFile(path.join(pastaPublica, 'index.html'), (err) => {
    if (err) {
      // Se der erro, tenta procurar na raiz como última tentativa
      res.sendFile(path.join(__dirname, 'index.html'), (err2) => {
          if (err2) res.send("ERRO FINAL: O arquivo index.html não está na pasta 'public' nem na raiz.");
      });
    }
  });
});

// === CÓDIGO DO JOGO (SOCKET.IO) ===
const rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Player conectado:', socket.id);

  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    rooms[roomId] = {};
    rooms[roomId][socket.id] = { x: 1200, y: 1200 };
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
  });

  socket.on('joinRoom', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId][socket.id] = { x: 1200, y: 1200 };
      socket.join(roomId);
      socket.emit('joinedRoom', roomId);
      socket.emit('updatePlayers', rooms[roomId]);
    }
  });

  socket.on('move', (data) => {
    const { roomId, x, y } = data;
    if (rooms[roomId] && rooms[roomId][socket.id]) {
      rooms[roomId][socket.id].x = x;
      rooms[roomId][socket.id].y = y;
      if (data.state) rooms[roomId][socket.id].state = data.state;
    }
  });

  socket.on('disconnect', () => {
      for (const roomId in rooms) {
          if (rooms[roomId][socket.id]) {
              delete rooms[roomId][socket.id];
              if(Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
          }
      }
  });
});

setInterval(() => {
  for (const roomId in rooms) {
    io.to(roomId).emit('updatePlayers', rooms[roomId]);
  }
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
