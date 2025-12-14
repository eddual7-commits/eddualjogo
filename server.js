const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require('fs');
const path = require('path');

// === MODO SHERLOCK HOLMES (Auto-Detectar o HTML) ===
// Procura por qualquer variação de nome: index.html, Index.html, INDEX.HTML
const pastaRaiz = __dirname;
const arquivosNaPasta = fs.readdirSync(pastaRaiz);

// Tenta achar o arquivo ignorando maiúsculas/minúsculas
const nomeArquivoHtml = arquivosNaPasta.find(arquivo => 
  arquivo.toLowerCase() === 'index.html'
);

console.log("Arquivos encontrados no servidor:", arquivosNaPasta);
console.log("Arquivo HTML escolhido:", nomeArquivoHtml || "NENHUM");

// Configura a pasta pública
app.use(express.static(pastaRaiz));

app.get('/', (req, res) => {
  if (nomeArquivoHtml) {
    // Se achou o arquivo (seja Index ou index), entrega ele!
    res.sendFile(path.join(pastaRaiz, nomeArquivoHtml));
  } else {
    // Se não achou, mostra na tela O QUE tem lá pra gente não ficar doido
    res.status(404).send(`
      <body style="background: #111; color: #f00; font-family: monospace; padding: 20px;">
        <h1>ERRO: ARQUIVO SUMIU</h1>
        <p>O servidor procurou por 'index.html' (qualquer jeito) e não achou.</p>
        <hr>
        <h3>LISTA REAL DE ARQUIVOS NA PASTA:</h3>
        <ul style="color: #fff; font-size: 18px;">
          ${arquivosNaPasta.map(f => `<li>${f}</li>`).join('')}
        </ul>
        <hr>
        <p>Se o 'index.html' não estiver nessa lista branca acima, você esqueceu de dar Commit/Push nele no GitHub!</p>
      </body>
    `);
  }
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
    rooms[roomId][socket.id] = { x: 1200, y: 1200 }; // Posição inicial segura
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
  });

  socket.on('joinRoom', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId][socket.id] = { x: 1200, y: 1200 };
      socket.join(roomId);
      socket.emit('joinedRoom', roomId); // Confirma entrada
      // Envia estado atual da sala para quem entrou
      socket.emit('updatePlayers', rooms[roomId]);
    } else {
      socket.emit('error', 'Sala não encontrada');
    }
  });

  socket.on('move', (data) => {
    // data = { roomId, x, y, state, ... }
    const { roomId, x, y } = data;
    if (rooms[roomId] && rooms[roomId][socket.id]) {
      // Atualiza posição
      rooms[roomId][socket.id].x = x;
      rooms[roomId][socket.id].y = y;
      
      // Se quiser passar estado extra (animação, hp), adicione aqui:
      if (data.state) rooms[roomId][socket.id].state = data.state;
    }
  });
  
  socket.on('disconnect', () => {
      for (const roomId in rooms) {
          if (rooms[roomId][socket.id]) {
              delete rooms[roomId][socket.id];
              // Remove sala vazia
              if(Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
          }
      }
  });
});

// Loop do Servidor (20 FPS)
setInterval(() => {
  for (const roomId in rooms) {
    io.to(roomId).emit('updatePlayers', rooms[roomId]);
  }
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
