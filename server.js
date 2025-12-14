const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

const rooms = {}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6)
}

io.on("connection", socket => {
  console.log("conectou:", socket.id)

  socket.on("createRoom", () => {
    const roomId = generateRoomId()
    rooms[roomId] = { players: {} }

    rooms[roomId].players[socket.id] = {
      x: 120,
      y: 200
    }

    socket.join(roomId)
    socket.emit("roomCreated", roomId)

    io.to(roomId).emit("updatePlayers", rooms[roomId].players)
  })

  socket.on("joinRoom", roomId => {
    if (!rooms[roomId]) return

    rooms[roomId].players[socket.id] = {
      x: 280,
      y: 200
    }

    socket.join(roomId)
    io.to(roomId).emit("updatePlayers", rooms[roomId].players)
  })

  socket.on("move", data => {
    const { roomId, x, y } = data
    if (!rooms[roomId]) return
    if (!rooms[roomId].players[socket.id]) return

    rooms[roomId].players[socket.id].x = x
    rooms[roomId].players[socket.id].y = y

    io.to(roomId).emit("updatePlayers", rooms[roomId].players)
  })

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id]
        io.to(roomId).emit("updatePlayers", rooms[roomId].players)
      }
    }
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log("server rodando na porta", PORT)
})
