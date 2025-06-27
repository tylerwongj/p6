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

### Development Philosophy
**"Working Game First → Extract Packages"**
- Build games that work in monorepo
- Extract proven, working code into shared packages
- Test each extraction step thoroughly
- No architectural guesswork - validate with real implementations