# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Production Commands
```bash
# Start unified server (loads all 3 working games)
npm start
# → Serves: http://localhost:3000 (hub), /pong, /snake, /tic-tac-toe

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

# Develop individual game (any port)
cd games-not-yet-tested/new-game && npm start

# Move working game to production (auto-loaded)
mv games-not-yet-tested/game games/

# Move broken game to tested folder
mv games/broken-game games-tested/
```

## Current Status

### Working Games (3) ✅
- **Pong**: Real-time multiplayer paddle game with physics
- **Snake**: Multiplayer snake with direction queue and food generation  
- **Tic-tac-toe**: Turn-based strategy with spectator support

### Folder Organization
- `/games/` - Production games (auto-loaded by unified server)
- `/games-tested/` - Broken games (tetris moved here)
- `/games-not-yet-tested/` - 200+ games in development

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
  └── tic-tac-toe/        # BaseGame implementation

/games-tested/             # ❌ Broken/problematic games (gitignored)
  └── tetris/             # Moved here due to issues

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

### Error Documentation
See `COMMON_ERRORS.md` for comprehensive troubleshooting guide covering Socket.io issues, game join problems, UI rendering, and multiplayer state management patterns.

### Development Philosophy
**"Working Game First → Extract Packages"**
- Build games that work in monorepo
- Extract proven, working code into shared packages
- Test each extraction step thoroughly
- No architectural guesswork - validate with real implementations