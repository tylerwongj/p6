# Common Game Errors & Fixes

This document tracks common issues encountered when setting up multiplayer games and their solutions.

## 🔌 Socket.io & Connection Issues

### Error: Missing Socket.io Script
**Problem:** Games show blank screen or connection errors
**Symptoms:** 
- Console errors about `io is not defined`
- Games stuck on "Waiting for connection..."

**Fix:**
```html
<!-- Add this to index.html before game.js -->
<script src="/socket.io/socket.io.js"></script>
<script type="module" src="game.js"></script>
```

### Error: Wrong Socket.io Import Method
**Problem:** ES6 import fails for Socket.io
**Symptoms:**
- Module import errors
- `import { io } from 'https://cdn.socket.io/...'` fails

**Fix:**
```javascript
// ❌ Don't do this
import { io } from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js';

// ✅ Do this instead
// Use the globally available io from socket.io script
const socket = io();
```

## 🎮 Game Join/Connection Issues

### Error: Wrong Event Names
**Problem:** Client and server use different event names
**Symptoms:**
- Join button doesn't work
- Server logs show unhandled events
- Players can't join games

**Common Mismatches:**
- Client: `join-game` ↔ Server: expects `joinGame`
- Client: `player-move` ↔ Server: expects `playerMove`

**Fix:**
```javascript
// ✅ Standard pattern - client side
socket.emit('joinGame', { name: playerName, roomId: 'game-name' });
socket.emit('playerMove', { position: 3 });
socket.emit('resetGame');

// ✅ Standard pattern - server side  
multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
  // Handle join
});
```

### Error: Missing Room ID Validation
**Problem:** Server accepts joins for wrong rooms
**Symptoms:**
- Games interfere with each other
- Players join wrong game types

**Fix:**
```javascript
// ✅ Always validate room ID
multiplayerServer.on('playerJoin', (socketId, playerName, roomId, socket) => {
  if (roomId !== 'expected-game-name') {
    return {
      success: false,
      reason: 'Wrong room - this is GameName'
    };
  }
  // ... rest of join logic
});
```

### Error: Missing playerAssigned Handler
**Problem:** Client doesn't handle successful join response
**Symptoms:**
- Join works but game doesn't start
- Stuck on join screen after successful join

**Fix:**
```javascript
// ✅ Client must handle these events
socket.on('playerAssigned', (data) => {
  playerId = data.playerId;
  playerName = data.playerName;
  hideJoinOverlay();
  // Start game UI
});

socket.on('joinFailed', (data) => {
  alert(`Failed to join: ${data.reason}`);
  showJoinOverlay(); // Show overlay again for retry
});
```

## 🖥️ Server Setup Issues

### Error: Port Conflicts
**Problem:** Multiple games try to use same port
**Symptoms:**
- `Error: listen EADDRINUSE: address already in use`
- Games won't start

**Fix:**
```javascript
// ✅ Use different ports for each game
const PORT = process.env.PORT || 3001; // Pong
const PORT = process.env.PORT || 3002; // Tic-tac-toe  
const PORT = process.env.PORT || 3003; // Snake
const PORT = process.env.PORT || 3004; // Tetris
```

### Error: Wrong Server Startup Location
**Problem:** Running npm start from wrong directory
**Symptoms:**
- HTML loads but no game functionality
- No server logs appear

**Fix:**
```bash
# ❌ Don't run from workspace root
cd /Users/tyler/p6
npm start  # This doesn't start any game server

# ✅ Run from individual game directory
cd /Users/tyler/p6/games/snake
npm start  # This starts the snake server
```

### Error: Missing Package Dependencies
**Problem:** Games import non-existent packages
**Symptoms:**
- `Cannot find module '@tyler-arcade/...'`
- Import errors on client side

**Common Missing Packages:**
- `MultiplayerClient` doesn't exist (use Socket.io directly)
- Wrong import paths

**Fix:**
```javascript
// ❌ Don't import non-existent MultiplayerClient
import { MultiplayerClient } from '@tyler-arcade/multiplayer';

// ✅ Use Socket.io directly for client
const socket = io();

// ✅ Server can use these packages
import { MultiplayerServer } from '@tyler-arcade/multiplayer';
import { BaseGame } from '@tyler-arcade/multiplayer';
```

## 🎨 UI/Rendering Issues

### Error: Missing Game Grid Creation
**Problem:** Game board appears blank after joining
**Symptoms:**
- Join overlay disappears
- Blank screen where game should be
- No visual game elements

**Fix:**
```javascript
// ✅ Create grid cells dynamically
function createGameBoard() {
  const container = document.getElementById('gameContainer');
  container.innerHTML = `
    <div class="game-board">
      <div class="game-grid" id="gameGrid">
        ${Array(200).fill().map(() => '<div class="cell"></div>').join('')}
      </div>
    </div>
  `;
}

// Call this after successful join
socket.on('playerAssigned', (data) => {
  hideJoinOverlay();
  createGameBoard(); // ✅ Create the visual elements
  startGame();
});
```

### Error: Global Function Export for ES6 Modules  
**Problem:** HTML onclick handlers don't work with ES6 modules
**Symptoms:**
- `joinGame is not defined` error
- Join button doesn't respond

**Fix:**
```javascript
// ✅ Export functions to window object
function joinGame() {
  // ... join logic
}

// Make function globally available for HTML onclick
window.joinGame = joinGame;
```

### Error: Single Player Display in Multiplayer Games
**Problem:** Only shows one player's board instead of all players side-by-side
**Symptoms:**
- Can join multiplayer but only see your own game
- Missing other players' boards
- No competitive multiplayer view

**Fix:**
```javascript
// ✅ Handle multiplayer game state updates
socket.on('gameState', (state) => {
  if (state.players) {
    updatePlayersDisplay(state.players); // Show all players
  }
});

// ✅ Create boards for all players
function updatePlayersDisplay(players) {
  const container = document.getElementById('playersContainer');
  container.innerHTML = '';
  
  players.forEach(player => {
    const isMe = player.id === socket.id;
    const playerDiv = document.createElement('div');
    playerDiv.innerHTML = `
      <div class="player-info ${isMe ? 'current-player' : ''}">
        <div class="player-name">${player.name}${isMe ? ' (You)' : ''}</div>
        <!-- Player stats -->
      </div>
      <div class="game-board">
        <div class="game-grid" id="grid-${player.id}">
          ${Array(200).fill().map(() => '<div class="cell"></div>').join('')}
        </div>
      </div>
    `;
    container.appendChild(playerDiv);
  });
}
```

### Error: Wrong Data Structure Access in Rotation
**Problem:** Game piece rotation doesn't work
**Symptoms:**
- Rotation keys do nothing
- Console errors about undefined properties
- Pieces don't rotate when expected

**Fix:**
```javascript
// ❌ Wrong - trying to access nested array incorrectly
const rotated = this.currentPiece.shape[0].map((_, i) =>
  this.currentPiece.shape.map(row => row[i]).reverse()
);
// Then wrapping in extra array: shape: [rotated]

// ✅ Correct - direct access to shape array
const rotated = this.currentPiece.shape[0].map((_, i) =>
  this.currentPiece.shape.map(row => row[i]).reverse()
);
// Direct assignment: shape: rotated
```

## 🔄 Game State & Broadcasting Issues

### Error: Game State Not Broadcasting
**Problem:** Players join but never receive game updates
**Symptoms:**
- Successful join but game doesn't start
- No game state updates
- Players stuck waiting

**Fix:**
```javascript
// ✅ Broadcast to specific room, not all clients
multiplayerServer.broadcastToRoom('game-name', 'gameState', gameData);

// ✅ Send immediate game state after join
socket.on('playerJoin', (socketId, playerName, roomId, socket) => {
  // ... join logic
  
  // Send immediate game state to new player
  multiplayerServer.sendToClient(socketId, 'gameState', currentGameState);
  
  return { success: true, playerData: {...} };
});
```

### Error: Wrong Game State Structure
**Problem:** Client expects different data format than server sends
**Symptoms:**
- Game state received but UI doesn't update
- JavaScript errors in updateUI functions

**Fix:**
```javascript
// ✅ Consistent game state format
const gameState = {
  players: [], // Array of player objects
  gameStatus: 'waiting', // 'waiting', 'playing', 'ended'
  // ... other game-specific data
};

// ✅ Server sends players as array
multiplayerServer.broadcastToRoom('game-name', 'gameState', {
  ...gameState,
  players: Object.values(gameState.players) // Convert object to array
});
```

### Error: Broadcasting to All Clients Instead of Game Room
**Problem:** Game state sent to wrong clients or all clients globally
**Symptoms:**
- Game data leaking between different games
- Players seeing wrong game updates
- Cross-game interference

**Fix:**
```javascript
// ❌ Don't broadcast globally
multiplayerServer.broadcast('gameState', gameData);

// ✅ Broadcast to specific game room only
multiplayerServer.broadcastToRoom('tetris', 'gameState', gameData);
multiplayerServer.broadcastToRoom('snake', 'gameState', gameData);
multiplayerServer.broadcastToRoom('tic-tac-toe', 'gameState', gameData);
```

## 🔧 Package/Import Issues

### Error: Wrong Static File Serving Order
**Problem:** Package imports fail with 404 errors
**Symptoms:**
- `Failed to load module script` errors
- 404 errors for package files

**Fix:**
```javascript
// ✅ Serve static files BEFORE routes
app.use(express.static('public'));
app.use('/node_modules', express.static('../../node_modules'));

// Routes come after static file serving
app.get('/', (req, res) => { /* ... */ });
```

## 🕹️ Game-Specific Issues

### Snake Game: Direction Queue
**Problem:** Unresponsive controls or movement issues
**Solution:** Implemented configurable direction queue (2-3 directions max)

### Snake Game: Food Spawning
**Problem:** Food spawns on snake body or in corners only
**Solution:** Added collision detection for food placement

### Tetris Game: Missing Visual Elements
**Problem:** Game logic works but no visual board
**Solution:** Dynamically create grid cells in HTML

### Tetris Game: Rotation Not Working
**Problem:** Piece rotation keys do nothing
**Symptoms:**
- Q, E, U, O rotation keys don't work
- Pieces don't rotate when expected
- No console errors but no rotation happens

**Solution:** Fix data structure access in rotation functions
```javascript
// ❌ Wrong - extra array wrapping
testPiece = { ...currentPiece, shape: [rotated] };
currentPiece.shape = [rotated];

// ✅ Correct - direct assignment
testPiece = { ...currentPiece, shape: rotated };
currentPiece.shape = rotated;
```

### Tetris Game: Single Player View Only
**Problem:** Multiplayer Tetris shows only one player's board
**Solution:** Implement side-by-side multiplayer display with `updatePlayersDisplay()`

### Tic-tac-toe: Event Handling Mismatch
**Problem:** Moves not registering on server
**Solution:** Standardize event names between client/server

## 🛠️ Quick Debugging Checklist

When a game doesn't work:

1. **Check Server Startup**
   - [ ] Running from correct directory (`games/[game-name]`)
   - [ ] No port conflicts
   - [ ] Server starts without errors

2. **Check Browser Console**
   - [ ] No JavaScript errors
   - [ ] Socket.io connects successfully
   - [ ] Join events are sent

3. **Check Server Console**
   - [ ] Join events are received
   - [ ] Player assignment succeeds
   - [ ] Game state broadcasts work

4. **Check HTML Structure**
   - [ ] Socket.io script loaded
   - [ ] Game functions exported to window
   - [ ] Required DOM elements exist

5. **Check Event Flow**
   - [ ] Client sends: `joinGame` with correct roomId
   - [ ] Server validates room and responds with `playerAssigned`
   - [ ] Client hides overlay and shows game
   - [ ] Server broadcasts game state updates

### Error: Directory Name Conflicts
**Problem:** Creating games with names that already exist
**Symptoms:**
- Package.json files exist but incomplete
- Duplicate game names in games-not-yet-tested folder
- Games overwrite each other

**Fix:**
```bash
# ✅ Always check existing games first
ls /Users/tyler/p6/games-not-yet-tested | grep -i mastermind
# If exists, pick different name like "codebreaker" instead

# ✅ Check for similar names to avoid confusion
ls /Users/tyler/p6/games-not-yet-tested | grep -i "battle"
# battleship, battleships, battleships-new, etc.
```

## 🎯 ES6 Module Loading Issues

### Error: Missing `type="module"` in Script Tag
**Problem:** ES6 imports fail in browser
**Symptoms:**
- `SyntaxError: Cannot use import statement outside a module`
- Game scripts don't load properly

**Fix:**
```html
<!-- ❌ Regular script tag -->
<script src="game.js"></script>

<!-- ✅ Module script tag -->
<script type="module" src="game.js"></script>
```

### Error: Global Function Access with ES6 Modules
**Problem:** HTML onclick handlers can't access functions in ES6 modules
**Symptoms:**
- `joinGame is not defined` errors
- Join buttons don't work despite function existing

**Fix:**
```javascript
// ✅ At end of ES6 module file, export to window
function joinGame() {
  // ... function logic
}

// Export to global scope for HTML onclick
window.joinGame = joinGame;
window.functionName = functionName;
```

### Error: Static File Route Order
**Problem:** Package imports return 404 errors
**Symptoms:**
- `Failed to load module script` for packages
- Express routes interfere with static files

**Fix:**
```javascript
// ✅ Static files BEFORE HTML routes
app.use('/game', express.static('games/game/public')); // FIRST
app.get('/game', (req, res) => res.sendFile('index.html')); // SECOND

// ❌ Wrong order causes 404s
app.get('/game', (req, res) => res.sendFile('index.html')); // FIRST
app.use('/game', express.static('games/game/public')); // SECOND
```

## 📝 Prevention Tips

- **Always use the same patterns** across games for consistency
- **Test each game individually** before adding to collection
- **Use unique ports** for each game (3001, 3002, 3003, etc.)
- **Validate room IDs** on server to prevent cross-game interference
- **Add debugging logs** during development
- **Follow the working Pong game** as the template for new games
- **Check for existing game names** before creating new ones

---

## 🎉 Party/Social Games Pattern Issues

### Error: Socket.io CDN Import Pattern
**Problem:** Inconsistent Socket.io import methods across different game types
**Symptoms:**
- Some games use CDN import, others use package imports
- Import failures when switching between games

**Standardized Fix:**
```javascript
// ✅ Standard pattern for all new games
import io from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js';

// Initialize socket connection
let socket = null;
function connectToServer() {
    socket = io();
    // ... socket event handlers
}
```

### Error: Team-Based Game State Management 
**Problem:** Games with teams (like Codenames) need different state structure
**Symptoms:**
- Team assignments not working
- Spymaster roles not functioning
- Player roles getting confused

**Fix:**
```javascript
// ✅ Team-based game state pattern
const gameState = {
    players: new Map(),
    teams: {
        red: { players: [], spymaster: null, score: 0 },
        blue: { players: [], spymaster: null, score: 0 }
    },
    gamePhase: 'lobby', // lobby, playing, gameOver
    currentTeam: 'red'
};

// Handle team joining
socket.on('join-team', (teamColor) => {
    // Remove from current team first
    // Add to new team with validation
});
```

### Error: Room Code vs Main Room Pattern
**Problem:** Inconsistent room handling between games
**Symptoms:**
- Some games default to 'main' room, others require codes
- Room isolation not working properly

**Fix:**
```javascript
// ✅ Standard room pattern for all games
socket.on('join-game', (data) => {
    const { playerName, roomCode } = data;
    const roomId = roomCode || 'main'; // Always default to 'main'
    
    if (!gameState.rooms.has(roomId)) {
        gameState.rooms.set(roomId, createRoom(roomId));
    }
});
```

### Error: Auto-Generated Player Names
**Problem:** Inconsistent name generation across games
**Symptoms:**
- Some games use generic "Player123", others use theme-appropriate names
- Name collisions in same room

**Fix:**
```javascript
// ✅ Theme-appropriate name generation
// 20 Questions: `Player${Math.floor(Math.random() * 1000)}`
// Duck Duck Goose: `Duck${Math.floor(Math.random() * 1000)}`
// Charades: `Actor${Math.floor(Math.random() * 1000)}`
// Codenames: `Agent${Math.floor(Math.random() * 1000)}`
// Guess Who: `Player${Math.floor(Math.random() * 1000)}`

const player = {
    id: socket.id,
    name: playerName || `ThemePrefix${Math.floor(Math.random() * 1000)}`,
    // ... other properties
};
```

### Error: Turn-Based vs Real-Time Game Patterns
**Problem:** Different games need different update patterns
**Symptoms:**
- Real-time games (Duck Duck Goose) feel laggy with turn-based updates
- Turn-based games (Guess Who) get spammed with unnecessary updates

**Fix:**
```javascript
// ✅ Turn-based games (20 Questions, Guess Who, Codenames)
socket.on('make-move', (data) => {
    // Validate it's player's turn
    if (gameState.currentPlayer !== socket.id) return;
    
    // Process move
    // Update turn to next player
    // Broadcast state update
});

// ✅ Real-time games (Duck Duck Goose, Charades)  
socket.on('player-action', (data) => {
    // Process immediately without turn validation
    // Broadcast to all players instantly
});
```

### Error: Game Phase Management
**Problem:** Complex games need proper phase transitions
**Symptoms:**
- Players stuck in wrong game phase
- Actions allowed at wrong times
- UI showing incorrect controls

**Fix:**
```javascript
// ✅ Clear phase management pattern
const validPhases = ['waiting', 'playing', 'results', 'gameOver'];

function transitionToPhase(newPhase) {
    if (!validPhases.includes(newPhase)) return;
    
    gameState.gamePhase = newPhase;
    io.emit('phase-changed', { phase: newPhase });
    updateAllPlayerControls();
}

// Validate actions based on phase
socket.on('player-action', (data) => {
    if (!isActionValidForPhase(data.action, gameState.gamePhase)) {
        return; // Ignore invalid actions
    }
    // Process valid action
});
```

### Error: Missing Package Imports in Dice Games
**Problem:** Dice games (Yatzy, Yams, Yahtzee, Yacht Dice) often try to import non-existent packages
**Symptoms:**
- `Cannot find module '@tyler-arcade/...'` errors
- `import { InputManager }` failures
- Games that use complex package structures

**Fix:**
```javascript
// ❌ Don't import non-standard packages
import { InputManager } from '../../packages/2d-input/src/InputManager.js'
import { BackToHub } from '../../packages/ui-components/src/BackToHub.js'

// ✅ Remove or comment out these imports
// These packages may not exist in all setups
```

### Error: Custom Event vs Game Action Pattern
**Problem:** Server uses different event handling patterns
**Symptoms:**
- Client emits `gameEvent` but server expects `gameAction`
- Inconsistent parameter structures

**Fix:**
```javascript
// ❌ Old custom event pattern
socket.emit('gameEvent', 'rollDice')
multiplayerServer.on('customEvent', (socketId, eventName, args) => { ... })

// ✅ Standard game action pattern  
socket.emit('gameAction', { type: 'rollDice' })
multiplayerServer.on('gameAction', (socketId, action, socket) => { 
  switch (action.type) { ... }
})
```

*Last updated: Session fixing dice games (Yatzy, Yams, Yahtzee, Yacht Dice) + Package imports + Event patterns + Standard multiplayer framework compliance*