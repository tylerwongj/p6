import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { MultiplayerServer } from '@tyler-arcade/multiplayer';
import { TwentyFortyEightGame } from './twenty-forty-eight-game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const multiplayerServer = new MultiplayerServer(server);

const PORT = process.env.PORT || 3026;

// Serve static files
app.use(express.static('public'));
app.use('/node_modules', express.static('../../node_modules'));

// Create 2048 game instance
const twentyFortyEightGame = new TwentyFortyEightGame();
twentyFortyEightGame.setMultiplayerServer(multiplayerServer);

// Connect game to multiplayer server with callbacks
multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
    console.log(`🔗 Server: Routing join request from ${playerName} (${socketId}) to 2048 game`);
    const result = twentyFortyEightGame.handlePlayerJoin(socketId, playerName, roomId, socket);
    console.log(`🔗 Server: 2048 game returned:`, result);
    return result;
});

multiplayerServer.on('playerLeave', (socketId, player, socket) => {
    console.log(`🔗 Server: Routing leave request from ${socketId} to 2048 game`);
    twentyFortyEightGame.handlePlayerLeave(socketId, player, socket);
});

multiplayerServer.on('playerInput', (socketId, input, socket) => {
    twentyFortyEightGame.handlePlayerInput(socketId, input, socket);
});

multiplayerServer.on('customEvent', (socketId, eventName, args, socket) => {
    console.log(`🔗 Server: Routing custom event '${eventName}' from ${socketId} to 2048 game`);
    twentyFortyEightGame.handleCustomEvent(socketId, eventName, args, socket);
});

multiplayerServer.on('playerConnected', (socketId, socket) => {
    console.log(`🔗 Server: New connection ${socketId}`);
    twentyFortyEightGame.handlePlayerConnected(socketId, socket);
});

// Start server
server.listen(PORT, () => {
    console.log(`🎮 2048 Multiplayer game server running on http://localhost:${PORT}`);
    console.log('Ready for competitive 2048 action!');
});