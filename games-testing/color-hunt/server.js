const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

// Serve static files
app.use(express.static(path.join(__dirname, 'public')))

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

const PORT = process.env.PORT || 3008

// Basic socket handling for standalone mode
io.on('connection', (socket) => {
    console.log('Player connected to Color Hunt')
    
    socket.on('disconnect', () => {
        console.log('Player disconnected from Color Hunt')
    })
})

server.listen(PORT, () => {
    console.log(`Color Hunt running on port ${PORT}`)
})