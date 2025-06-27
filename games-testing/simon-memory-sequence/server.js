import express from 'express'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { SimonMemorySequenceGame } from './simon-memory-sequence-game.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const server = createServer(app)
const io = new SocketServer(server)

app.use(express.static(join(__dirname, 'public')))

const game = new SimonMemorySequenceGame()

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id)
    
    socket.on('joinGame', (data) => {
        const result = game.handlePlayerJoin(socket.id, data.name, data.roomId, socket)
        
        if (result.success) {
            socket.join(data.roomId)
            socket.emit('playerAssigned', result)
        } else {
            socket.emit('joinError', { message: result.reason })
        }
    })
    
    socket.on('customEvent', (eventName, ...args) => {
        game.handleCustomEvent(socket.id, eventName, args, socket)
    })
    
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id)
        const player = game.players.find(p => p.id === socket.id)
        if (player) {
            game.handlePlayerLeave(socket.id, player, socket)
        }
    })
})

// Set up broadcasting for the game
game.broadcast = (event, data) => {
    io.to('simon-memory-sequence').emit(event, data)
}

const PORT = process.env.PORT || 3004
server.listen(PORT, () => {
    console.log(`Simon Memory Sequence server running on port ${PORT}`)
})