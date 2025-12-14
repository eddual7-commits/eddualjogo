
const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

const rooms = {}

io.on("connection", socket => {
  socket.on("createRoom", () => {
    const roomId = Math.random().toString(36).slice(2, 7)
    rooms[roomId] = { players: {} }

    socket.join(roomId)
    rooms[roomId].players[socket.id] = { x: 100, y: 100 }

    socket.emit("roomCreated", roomId)
    io.to(roomId).emit("updatePlayers", rooms[roomId].players)
  })

  socket.on("joinRoom", roomId => {
    if (!rooms[roomId] || Object.keys(rooms[roomId].players).length >= 2) return

    socket.join(roomId)
    rooms[roomId].players[socket.id] = { x: 200, y: 200 }

    io.to(roomId).emit("updatePlayers", rooms[roomId].players)
  })

  socket.on("move", data => {
    const room = rooms[data.roomId]
    if (!room || !room.players[socket.id]) return

    room.players[socket.id].x = data.x
    room.players[socket.id].y = data.y

    io.to(data.roomId).emit("updatePlayers", room.players)
  })

  socket.on("disconnect", () => {
    for (const id in rooms) {
      if (rooms[id].players[socket.id]) {
        delete rooms[id].players[socket.id]
        io.to(id).emit("updatePlayers", rooms[id].players)
      }
    }
  })
})

server.listen(process.env.PORT || 3000)
