import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { MultiplayerServer } from '@tyler-arcade/multiplayer';
import { TwentyQuestionsGame } from './twenty-questions-game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const multiplayerServer = new MultiplayerServer(server);

const PORT = process.env.PORT || 3025;

// Serve static files
app.use(express.static('public'));
app.use('/node_modules', express.static('../../node_modules'));

// Create 20 Questions game instance
const twentyQuestionsGame = new TwentyQuestionsGame();
twentyQuestionsGame.setMultiplayerServer(multiplayerServer);

// Connect game to multiplayer server with callbacks
multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
    console.log(`🔗 Server: Routing join request from ${playerName} (${socketId}) to 20 Questions game`);
    const result = twentyQuestionsGame.handlePlayerJoin(socketId, playerName, roomId, socket);
    console.log(`🔗 Server: 20 Questions game returned:`, result);
    return result;
});

multiplayerServer.on('playerLeave', (socketId, player, socket) => {
    console.log(`🔗 Server: Routing leave request from ${socketId} to 20 Questions game`);
    twentyQuestionsGame.handlePlayerLeave(socketId, player, socket);
});

multiplayerServer.on('playerInput', (socketId, input, socket) => {
    twentyQuestionsGame.handlePlayerInput(socketId, input, socket);
});

multiplayerServer.on('customEvent', (socketId, eventName, args, socket) => {
    console.log(`🔗 Server: Routing custom event '${eventName}' from ${socketId} to 20 Questions game`);
    twentyQuestionsGame.handleCustomEvent(socketId, eventName, args, socket);
});

multiplayerServer.on('gameAction', (socketId, action, socket) => {
    console.log(`🔗 Server: Routing game action '${action.type}' from ${socketId} to 20 Questions game`);
    twentyQuestionsGame.handleCustomEvent(socketId, 'gameAction', action, socket);
});

multiplayerServer.on('playerConnected', (socketId, socket) => {
    console.log(`🔗 Server: New connection ${socketId}`);
    twentyQuestionsGame.handlePlayerConnected(socketId, socket);
});

// Start server
server.listen(PORT, () => {
    console.log(`🤔 20 Questions game server running on http://localhost:${PORT}`);
    console.log('Ready for guessing games!');
});