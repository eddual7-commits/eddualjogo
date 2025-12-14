const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require('fs');
const path = require('path');

// === ÁREA DE DIAGNÓSTICO ===
console.log("========================================");
console.log("DIAGNÓSTICO DO SERVIDOR INICIADO");
console.log("Pasta onde o server.js está (__dirname):", __dirname);
console.log("Pasta onde o Node está rodando (cwd):", process.cwd());

try {
    const arquivos = fs.readdirSync(__dirname);
    console.log("ARQUIVOS ENCONTRADOS NESTA PASTA:", arquivos);
} catch (e) {
    console.log("ERRO AO LER PASTA:", e.message);
}
console.log("========================================");
// =============================

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  // Tenta achar o arquivo de forma robusta
  const caminhoArquivo = path.join(__dirname, 'index.html');
  
  if (fs.existsSync(caminhoArquivo)) {
      res.sendFile(caminhoArquivo);
  } else {
      res.status(404).send(`
        <h1>ERRO CRÍTICO</h1>
        <p>O arquivo index.html não foi encontrado no servidor.</p>
        <p>O servidor procurou em: ${caminhoArquivo}</p>
        <p>Verifique os Logs do Render para ver a lista de arquivos disponíveis.</p>
      `);
  }
});

// Lógica do Jogo (Mantida para quando funcionar)
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
    }
  });

  socket.on('move', (data) => {
    const { roomId, x, y } = data;
    if (rooms[roomId] && rooms[roomId][socket.id]) {
      rooms[roomId][socket.id].x = x;
      rooms[roomId][socket.id].y = y;
    }
  });
  
  // Limpeza de desconexão
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
