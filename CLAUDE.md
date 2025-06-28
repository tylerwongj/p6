# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Production Commands
```bash
# Start unified server (loads all 7 working games)
npm start
# → Serves: http://localhost:3000 (hub), /pong, /snake, /tic-tac-toe, /asteroids, /card-war, /color-hunt, /simon-memory-sequence

# Install all workspace dependencies
npm run install-all

# Run tests across all workspaces  
npm run test

# Build all workspaces
npm run build
```

### Development Commands
```bash
# Create new game in development
mkdir games-not-yet-tested/new-game

# Move game to testing phase
mv games-not-yet-tested/new-game games-testing/

# Test game individually (any port)
cd games-testing/new-game && npm start

# Move working game to production (auto-loaded)
mv games-testing/new-game games/

# Move failed game to failed folder (gets gitignored)
mv games-testing/broken-game games-failed/
```

## Current Status

### Working Games (7) ✅
- **Pong**: Real-time multiplayer paddle game with physics
- **Snake**: Multiplayer snake with direction queue and food generation  
- **Tic-tac-toe**: Turn-based strategy with spectator support
- **Asteroids**: Real-time space shooter with asteroid field (continuous shooting enabled)
- **Card War**: Classic card comparison game - highest card wins
- **Color Hunt**: Fast-paced color matching challenge game
- **Simon Memory Sequence**: Classic Simon Says memory pattern game

### Folder Organization
- `/games/` - Production games (auto-loaded by unified server)
- `/games-testing/` - Games being actively tested and debugged  
- `/games-failed/` - Games that failed testing and were passed on (gitignored)
- `/games-not-yet-tested/` - 200+ games in development (gitignored)

## Architecture

### Unified Server System
The repository uses a **unified server architecture** where a single server (`server.js`) automatically discovers and loads all games from the `/games` directory. Games are accessible at `http://localhost:3000/[game-name]`.

**Key Components:**
- **GameRegistry**: Central router that manages multiple games and prevents event handler conflicts
- **MultiplayerServer**: Shared Socket.io instance with room-based isolation
- **BaseGame Pattern**: All games extend `BaseGame` class for consistent API

### Folder Structure
```
/games/                    # ✅ Working games (auto-loaded by unified server)
  ├── pong/               # BaseGame implementation
  ├── snake/              # BaseGame implementation
  ├── tic-tac-toe/        # BaseGame implementation
  ├── asteroids/          # BaseGame implementation (continuous shooting)
  ├── card-war/           # BaseGame implementation
  ├── color-hunt/         # BaseGame implementation
  └── simon-memory-sequence/  # BaseGame implementation

/games-testing/            # 🔧 Games being actively tested and debugged
  └── (empty - ready for testing new games)

/games-failed/             # ❌ Failed games (gitignored)
  ├── tetris/             # Moved here due to issues
  ├── connect-four/       # Moved here due to click handling issues  
  └── battleship-modern/  # Moved here due to game flow issues

/games-not-yet-tested/     # 🔄 Games in development (gitignored, 200+ games)
  ├── 20-questions/
  ├── baccarat/
  └── ...

/packages/                 # Shared npm workspaces
  ├── core/               # GameLoop, Canvas2D, EventBus
  ├── 2d-input/           # Input handling
  ├── 2d-physics/         # Collision detection
  ├── multiplayer/        # BaseGame, GameRegistry, MultiplayerServer
  └── ui-components/      # Shared UI components
```

### Game Implementation Pattern
**Required Files for Auto-Loading:**
```
/games/[game-name]/
├── [game-name]-game.js    # BaseGame implementation (required)
├── public/
│   ├── index.html         # Game UI
│   └── game.js           # Client-side logic
├── package.json
└── server.js             # Legacy standalone server (optional)
```

**BaseGame Class Requirements:**
```javascript
export class GameNameGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Display Name'
    this.description = 'Game description'
    this.maxPlayers = 2-4
  }
  
  // Required methods
  handlePlayerJoin(socketId, playerName, roomId, socket) { }
  handlePlayerLeave(socketId, player, socket) { }
  handleCustomEvent(socketId, eventName, args, socket) { }
  
  // Optional methods
  handlePlayerInput(socketId, input, socket) { }
  update(deltaTime) { } // Called by unified game loop at 60 FPS
}
```

### Multiplayer Networking
**Client Pattern:**
```javascript
const socket = io()
socket.emit('joinGame', { name: playerName, roomId: 'game-name' })
socket.on('playerAssigned', (data) => { /* start game */ })
socket.on('gameState', (state) => { /* update display */ })
```

**Room Isolation:** Each game uses room-based broadcasting to prevent cross-game interference:
```javascript
this.broadcast('gameState', gameData)  // Broadcasts to game's room only
```

### Package System
The codebase uses npm workspaces with local packages prefixed `@tyler-arcade/`. Games import shared functionality:
```javascript
import { BaseGame } from '@tyler-arcade/multiplayer'
import { CollisionDetection } from '@tyler-arcade/2d-physics'
import { InputManager } from '@tyler-arcade/2d-input'
```

### Auto-Discovery System
The unified server automatically:
1. Scans `/games` directory for subdirectories
2. Looks for `[game-name]-game.js` files
3. Imports and registers games with GameRegistry
4. Sets up Express routes and static file serving
5. Handles various export patterns (default export, named exports)

### Legacy Compatibility
Games without BaseGame classes are still served as static files for backward compatibility, but won't have multiplayer functionality through the unified server.

### BaseGame Integration Patterns

**Critical Implementation Requirements:**
- `handlePlayerJoin()` must return `{success: true, playerData: {...}}` format
- `spectators` array must be initialized in constructor
- `roomId` validation required: `if (roomId !== 'game-name') return {success: false}`
- Custom events: `socket.emit('customEvent', eventName, args)` not `{eventName, args}`
- Player data structure: Use `Array` for `this.players` unless overridden with `Map`
- Game loops: Remove custom game loops, use unified server `update(deltaTime)` method

**Common Migration Issues:**
- **Map vs Array Players**: Games using `Map` must override in constructor: `this.players = new Map()`
- **Custom Event Format**: Server expects separate `eventName` and `args` parameters
- **Spectator Initialization**: Must initialize `this.spectators = []` in constructor
- **Return Format**: `handlePlayerJoin` must return object with `success` boolean

## Recent Session Updates

### Latest Game Additions
**Session Summary**: Successfully added 3 new working games (Card War, Color Hunt, Simon Memory Sequence) and fixed critical join popup issues.

#### Games Added:
- **Card War**: Classic card comparison multiplayer game
- **Color Hunt**: Fast-paced color matching challenge
- **Simon Memory Sequence**: Memory pattern game (Simon Says)

#### Critical Fixes Applied:
1. **Join Popup Issues**: Fixed playerAssigned event data structure mismatch
   - **Problem**: Games returned `{ success: true, playerId, gameState }` 
   - **Solution**: Changed to `{ success: true, playerData: { playerId, gameState } }`
   - **Affected**: Simon Memory Sequence, Card War, Color Hunt

2. **Asteroids Continuous Shooting**: Enhanced shooting mechanics
   - **Problem**: Required individual spacebar presses for each bullet
   - **Solution**: Added time-based rate limiting (10 bullets/second max)
   - **Result**: Players can hold spacebar for continuous shooting

3. **Game Loop Conflicts**: Removed custom game loops
   - **Problem**: Color Hunt had custom setInterval game loop
   - **Solution**: Use unified server's update(deltaTime) method
   - **Benefit**: Consistent performance across all games

#### Games Moved to Failed:
- **Connect Four**: Click handling issues → games-failed/
- **Battleship Modern**: Game flow progression issues → games-failed/

### Error Documentation
See `COMMON_ERRORS.md` for comprehensive troubleshooting guide covering Socket.io issues, game join problems, UI rendering, and multiplayer state management patterns.

## 🚨 Current Critical Issues

### Server Stability Issue - Chess Game TypeError
**Status**: URGENT - Chess game causes server crashes when players attempt to join
**Error**: `TypeError: this.players.set is not a function`
**Impact**: Entire unified server becomes unstable, affecting all games
**Location**: `/games-testing/chess/chess-game.js:52`
**Required**: Immediate fix to prevent server crashes

### Games-Testing Status (Beta Games)
**Working**: 1 game
- ✅ bingo - Join and gameplay functional

**Broken**: 2 games  
- ❌ chess - Server crash on join (critical)
- ❌ concentration-memory - Join button non-functional

**Recently Failed**: 3 games moved to games-failed
- simon-memory-sequence - Ready button issues
- color-hunt - Ready button issues  
- card-war - Persistent ready button failures

### File Structure Refactoring Applied
**Legacy Organization**: All `server.js` files moved to `legacy/` subfolders
**Structure**:
```
games/[game-name]/
├── [game-name]-game.js    # Used by unified server  
├── public/
├── package.json
└── legacy/
    └── server.js          # Legacy standalone server
```

### Auto-Tab Opening Feature
**Enhancement**: Server opens 2 browser tabs per beta game for multiplayer testing
**Pattern**: game1-tab1, game1-tab2, game2-tab1, game2-tab2
**Timing**: 300ms between paired tabs, 800ms between games

## 🔧 Critical Game Development Patterns & Fixes

### Client-Side Rendering TypeError Prevention
**Pattern**: Always add null/undefined checks before accessing game state properties
```javascript
// ❌ Common Error: Accessing properties on undefined objects
if (gameState.players.forEach) // TypeError if gameState is null

// ✅ Defensive Pattern: Check object existence first
if (gameState && Array.isArray(gameState.players)) {
    gameState.players.forEach(player => { ... })
}

// ✅ Safe Property Access Pattern
const asteroidCount = (gameState && Array.isArray(gameState.asteroids)) 
    ? gameState.asteroids.length : 0
```

### Position 0 Handling in Grid Games
**Critical Issue**: JavaScript treats 0 as falsy, causing grid position bugs
```javascript
// ❌ Wrong: Position 0 gets ignored
const position = args[0]?.position || args.position

// ✅ Correct: Explicit undefined check
const position = args[0]?.position !== undefined 
    ? args[0].position : args.position

// ✅ Validation: Include 0 as valid position
if (typeof position === 'number' && position >= 0 && position <= 8) {
    // Valid position including 0
}
```

### Game State Array vs Object Compatibility
**Issue**: Server might send players as Array or Object, client must handle both
```javascript
// ✅ Flexible Format Handling
if (gameState.players) {
    if (Array.isArray(gameState.players)) {
        // Handle array format
        gameState.players.forEach(player => { ... })
    } else if (typeof gameState.players === 'object') {
        // Handle object format
        Object.values(gameState.players).forEach(player => { ... })
    }
}

// ✅ Player Count Calculation
const playerCount = gameState.players ? 
    (Array.isArray(gameState.players) 
        ? gameState.players.length 
        : Object.keys(gameState.players).length) : 0
```

### Win Condition Implementation Pattern
**Pattern**: First-to-X scoring with reset functionality
```javascript
// ✅ Server-side Win Detection
checkWinner() {
    for (const player of this.players) {
        if (player.score >= this.winningScore) {
            this.gameEnded = true
            this.winner = player
            this.broadcast('gameWon', { 
                winner: player.name, 
                score: player.score 
            })
            return true
        }
    }
    return false
}

// ✅ Client-side Reset Functionality
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') {  // R key for reset
        socket.emit('customEvent', 'resetScores', {})
    }
})
```

### Multiplayer Data Structure Issues
**Chess TypeError Pattern**: Map vs Array structure conflicts
```javascript
// ❌ Error: Using Map methods on Array structure
export class ChessGame extends BaseGame {
    constructor() {
        super()
        // BaseGame initializes this.players = [] (Array)
        // But trying to use: this.players.set(socketId, player)
    }
}

// ✅ Fix: Override with Map if needed
export class ChessGame extends BaseGame {
    constructor() {
        super()
        this.players = new Map() // Override with Map
    }
    
    handlePlayerJoin(socketId, playerName, roomId, socket) {
        // Now .set() method exists
        this.players.set(socketId, playerData)
    }
}
```

### Auto-Join System Integration
**Pattern**: Using TylerArcadePlayer for seamless joining
```javascript
// ✅ Auto-join Pattern (seen in Asteroids)
socket.on('connect', () => {
    playerId = socket.id
    // Auto-join using shared player name system
    playerName = TylerArcadePlayer.autoJoinGame(socket, 'asteroids')
})

// ✅ Manual Join Fallback
function joinGame() {
    const name = playerNameInput.value || generateRandomName()
    socket.emit('joinGame', { name, roomId: 'game-name' })
}
```

### Canvas Rendering Safety Pattern
**Issue**: Trying to render before canvas/context exists
```javascript
// ✅ Canvas Validation Pattern
function render() {
    if (!ctx || !canvas) {
        console.warn('Canvas not ready')
        return
    }
    
    // ✅ Game State Validation
    if (!gameState) {
        ctx.fillStyle = '#fff'
        ctx.fillText('Connecting...', canvas.width / 2, canvas.height / 2)
        return
    }
    
    // ✅ Wrap in try-catch for safety
    try {
        // ... rendering code
    } catch (error) {
        console.error('Render error:', error)
        ctx.fillText('Rendering error...', 50, 50)
    }
}
```

### Game Reset Functionality Pattern
**Pattern**: Server-side reset with client confirmation
```javascript
// ✅ Server-side Reset Handler
handleCustomEvent(socketId, eventName, args, socket) {
    switch (eventName) {
        case 'resetScores':
            this.resetGame()
            this.broadcast('scoresReset', { message: 'Scores reset!' })
            break
        case 'resetGame':
            this.resetGame()
            this.broadcast('gameReset', { message: 'New game started!' })
            break
    }
}

// ✅ Client-side Reset Confirmation
socket.on('scoresReset', (data) => {
    showMessage(data.message, 'green', 3000) // Green success message
})
```

### Debugging Patterns for Game Development
**Pattern**: Strategic console logging for multiplayer issues
```javascript
// ✅ Join Flow Debugging
handlePlayerJoin(socketId, playerName, roomId, socket) {
    console.log('🎮 Join attempt:', { socketId, playerName, roomId })
    console.log('📊 Players before:', this.players.length)
    // ... join logic
    console.log('✅ Players after:', this.players.length)
    return { success: true, playerData: {...} }
}

// ✅ Position-specific Debugging
if (position === 0) {
    console.log('🎯 POSITION 0 MOVE DETECTED:', { socketId, position })
}
```

### Error Recovery Patterns
**Pattern**: Graceful fallbacks when game state is corrupted
```javascript
// ✅ State Recovery Pattern
socket.on('gameState', (newGameState) => {
    try {
        if (validateGameState(newGameState)) {
            gameState = newGameState
            updateDisplay()
        } else {
            console.warn('Invalid game state received, requesting refresh')
            socket.emit('requestGameState')
        }
    } catch (error) {
        console.error('Game state processing error:', error)
        // Show user-friendly error message
        showMessage('Connection issue, refreshing...', 'orange')
    }
})
```

### Development Philosophy
**"Working Game First → Extract Packages"**
- Build games that work in monorepo
- Extract proven, working code into shared packages
- Test each extraction step thoroughly
- No architectural guesswork - validate with real implementations

## 🚨 CRITICAL Session Update (2024-12-27): JavaScript Errors & Game Enhancements

### 🛑 CRITICAL FIXES APPLIED - MUST KNOW FOR FUTURE GAMES

#### **Array/Map Data Type Errors (CRITICAL)**
**Problem**: `TypeError: players.forEach is not a function` - Server sending Map objects instead of arrays
**Root Cause**: Server uses Map for players, client expects arrays
**Solution**: ALWAYS add `Array.isArray()` checks before forEach
```javascript
// ❌ DANGEROUS - Will crash if server sends Map
players.forEach(player => { /* render player */ })

// ✅ SAFE - Always use this pattern
if (players && Array.isArray(players)) {
    players.forEach(player => { /* render player */ })
}
```
**Affected Games**: Asteroids, Block, Bingo - ALL FIXED

#### **Console Spam Performance Issues (CRITICAL)**
**Problem**: Debug logging in `getGameStateForClient()` called at 60 FPS = 3600 logs/minute
**Impact**: Server console unusable, performance degradation
**Solution**: NEVER put console.log in render loops or frequent methods
```javascript
// ❌ NEVER DO THIS
getGameStateForClient() {
    console.log('Game state:', this.players.length) // Called 60 times/second!
    return state
}

// ✅ CORRECT - Remove all debug logging from frequent methods
getGameStateForClient() {
    return state // Clean, no logging
}
```

#### **Missing BaseGame Properties (CRITICAL)**
**Problem**: Games show "Unknown Game" in hub
**Cause**: Missing `name`, `description`, `maxPlayers` properties
**Solution**: ALWAYS set these in constructor
```javascript
export class YourGame extends BaseGame {
    constructor() {
        super()
        this.name = 'Your Game Name'           // REQUIRED
        this.description = 'Game description'   // REQUIRED
        this.maxPlayers = 4                     // REQUIRED
        this.handleCustomEvent = () => {}       // REQUIRED (even if empty)
    }
}
```

### 🎮 GAME ENHANCEMENTS IMPLEMENTED

#### **🚀 Asteroids Game - Enhanced Competitive Play**
- **500 Point Win Condition**: First to 500 points wins with overlay + auto-restart
- **Variable Asteroid Speeds**: 25% slow, 50% normal, 25% fast (adds strategy)
- **25% More Asteroids**: Increased from 5 to 6 asteroids
- **Anti-Spawn-Kill Protection**: 100px safety buffer around players
- **Fixed Restart (Press 0)**: Resets ALL players, bullets, and asteroids
- **Winner Display**: 5-second overlay with trophy, auto-restart

#### **🎯 Block Game - Complete Collision System**
- **Player Safe Spawning**: 50px minimum distance from blocks and other players
- **Collectible Safe Spawning**: 50px minimum from blocks AND players
- **Player-to-Player Collision**: Cannot walk through each other
- **Block Collision**: Cannot walk through decorative blocks
- **100 Point Win Condition**: First to 100 points with on-screen winner display
- **HTML Scoreboard**: Moved from canvas to top-right HTML overlay

#### **🐍 Snake Game - Win-Based Scoring System**
- **Converted from Points to Wins**: Track rounds won instead of food eaten
- **Round System**: Each round ends when only 1 player survives
- **Persistent Win Tracking**: Win count preserved across rounds
- **UI Enhancement**: Shows "Wins: 3 | Length: 15" format
- **Auto-Restart**: 3-second delay between rounds

#### **🎱 Bingo Game - 4-Card Multi-Card System**
- **Four Simultaneous Cards**: Players get 4 bingo cards at once
- **Fill All Cards to Win**: Must complete ALL 4 cards completely
- **Enhanced Grid Layout**: 2x2 grid showing all 4 cards
- **Fixed Event Handling**: Proper playerAssigned data structure

### 🛠️ CRITICAL DEVELOPMENT PATTERNS FOR FUTURE GAMES

#### **Collision Detection Pattern (Use This)**
```javascript
// ✅ Safe spawn position finder
findSafeSpawnPosition() {
    let attempts = 0
    const maxAttempts = 50
    
    while (attempts < maxAttempts) {
        const pos = generateRandomPosition()
        
        // Check minimum distance from all objects
        let tooClose = false
        for (const obj of allObjects) {
            const distance = Math.sqrt((pos.x - obj.x) ** 2 + (pos.y - obj.y) ** 2)
            if (distance < 50) { // 50px minimum
                tooClose = true
                break
            }
        }
        
        if (!tooClose) return pos
        attempts++
    }
    
    return fallbackPosition() // Always have fallback
}
```

#### **Win Condition Pattern (Use This)**
```javascript
// ✅ Server-side win detection with auto-restart
checkWinCondition(player) {
    if (player.score >= this.winningScore) {
        this.broadcast('gameWinner', {
            winner: player.name,
            score: player.score,
            message: `🏆 ${player.name} wins with ${player.score} points!`
        })
        
        // Auto-restart after 5 seconds
        setTimeout(() => {
            this.resetAllPlayers()
            this.respawnObjects()
        }, 5000)
    }
}
```

#### **Client Rendering Safety Pattern (Always Use)**
```javascript
// ✅ Always validate before rendering
function render() {
    if (!gameState) {
        ctx.fillText('Connecting...', 400, 300)
        return
    }
    
    // Validate arrays before forEach
    if (gameState.players && Array.isArray(gameState.players)) {
        gameState.players.forEach(player => drawPlayer(player))
    }
    
    if (gameState.objects && Array.isArray(gameState.objects)) {
        gameState.objects.forEach(obj => drawObject(obj))
    }
}
```

### 🚫 NEVER DO THESE (Learned from Errors)

1. **NEVER** put console.log in `getGameStateForClient()` or any 60 FPS method
2. **NEVER** assume server data is arrays - always check with `Array.isArray()`
3. **NEVER** forget BaseGame properties (`name`, `description`, `maxPlayers`)
4. **NEVER** spawn objects without collision detection (causes instant kills)
5. **NEVER** forget `handleCustomEvent` method (causes client errors)

### 📊 CURRENT GAME STATUS (All Working)

**Production Games (8)**: ✅ All Enhanced & Stable
- Asteroids: 500-point competitive mode
- Bingo: 4-card multi-card system  
- Pong: Stable
- Snake: Win-based scoring
- Tic-Tac-Toe: Stable
- Card War: Stable
- Color Hunt: Stable
- Simon Memory: Stable

**Testing Games (1)**: ✅ Complete System
- Block: Full collision detection + 100-point wins

### 🎯 KEY TAKEAWAY FOR FUTURE DEVELOPMENT
**Every error we fixed was CRITICAL and would break future games. This documentation prevents repeating these mistakes and provides proven patterns for collision detection, win conditions, and safe rendering.**