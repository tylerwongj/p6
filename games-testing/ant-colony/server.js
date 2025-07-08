const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

// Import our game class
const { AntColonyGame } = require('./ant-colony-game.js')

// Create game instance
const game = new AntColonyGame()

// Serve static files
app.use(express.static(path.join(__dirname, 'public')))

// Route for game page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`)
    
    // Handle player joining
    socket.on('joinGame', (data) => {
        const result = game.handlePlayerJoin(socket.id, data.name, data.roomId, socket)
        
        if (result.success) {
            socket.join('ant-colony')
            socket.emit('playerAssigned', result)
            console.log(`${data.name} joined the ant colony`)
            
            // Send current game state
            socket.emit('gameState', game.getGameState())
            socket.to('ant-colony').emit('gameState', game.getGameState())
        } else {
            socket.emit('joinFailed', { reason: result.reason })
        }
    })
    
    // Handle player input/actions
    socket.on('customEvent', (eventName, args) => {
        game.handleCustomEvent(socket.id, eventName, args, socket)
    })
    
    // Handle disconnection
    socket.on('disconnect', () => {
        const player = game.players.find(p => p.id === socket.id)
        if (player) {
            game.handlePlayerLeave(socket.id, player, socket)
            console.log(`${player.name} left the ant colony`)
            
            // Notify other players
            socket.to('ant-colony').emit('gameState', game.getGameState())
        }
    })
})

// Game loop - 60 FPS
setInterval(() => {
    game.update(16.67) // ~60 FPS (1000ms / 60)
    
    // Broadcast game state to all players
    if (game.players.length > 0) {
        io.to('ant-colony').emit('gameState', game.getGameState())
    }
}, 16) // ~60 FPS

// Set up broadcasting for the game
game.broadcast = (event, data) => {
    io.to('ant-colony').emit(event, data)
}

game.sendToPlayer = (socketId, event, data) => {
    io.to(socketId).emit(event, data)
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
    console.log(`🐜 Ant Colony server running on port ${PORT}`)
    console.log(`🌐 Open http://localhost:${PORT} to start building colonies!`)
})