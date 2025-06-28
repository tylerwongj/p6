# Tyler Arcade - Unified Multiplayer Game Hub

A comprehensive multiplayer arcade game platform with unified server architecture.

## 🎮 Current Status

✅ **Unified Server Architecture** - Single server loads all games automatically  
✅ **3 Working Games** - Pong, Snake, Tic-tac-toe fully functional  
✅ **BaseGame Pattern** - Consistent API across all games  
✅ **Room-based Multiplayer** - Isolated networking per game  
🔄 **200+ Games in Development** - Extensive game library in progress

## 🚀 Quick Start

```bash
# Start unified server (loads all working games)
npm start

# Open game hub
open http://localhost:3000

# Access individual games
open http://localhost:3000/pong
open http://localhost:3000/snake
open http://localhost:3000/tic-tac-toe
```

## 📁 Structure

```
tyler-arcade/
├── games/                     # ✅ Working games (auto-loaded)
│   ├── pong/                  # Real-time paddle game
│   ├── snake/                 # Multiplayer snake game
│   └── tic-tac-toe/          # Turn-based strategy game
├── games-tested/              # ❌ Problematic games
│   └── tetris/               # Moved here due to issues
├── games-not-yet-tested/      # 🔄 200+ games in development
├── packages/                  # Shared packages
│   ├── core/                 # GameLoop, Canvas2D, EventBus
│   ├── 2d-input/             # Input handling
│   ├── 2d-physics/           # Collision detection
│   ├── multiplayer/          # BaseGame, GameRegistry, MultiplayerServer
│   └── ui-components/        # Shared UI components
└── public/                   # Game hub interface
```

## 🏗️ Unified Server Architecture

### Auto-Discovery System
- **Automatic Game Loading**: Server scans `/games` directory and loads all BaseGame implementations
- **Dynamic Routing**: Each game gets `/{game-name}` route automatically
- **Hot Deployment**: Add new games by moving them to `/games` folder

### GameRegistry & Multiplayer
- **Centralized Routing**: Single GameRegistry prevents event handler conflicts
- **Room Isolation**: Each game uses separate Socket.io rooms
- **Shared Resources**: Single server, unified game loop, shared packages

### BaseGame Pattern
All games implement consistent interface:
```javascript
export class GameNameGame extends BaseGame {
  handlePlayerJoin(socketId, playerName, roomId, socket) { }
  handlePlayerLeave(socketId, player, socket) { }
  handleCustomEvent(socketId, eventName, args, socket) { }
  update(deltaTime) { } // 60 FPS game loop
}
```

## 🎮 Game Features

### Cross-Game Features
- ✅ **Real-time Multiplayer** - Socket.io networking
- ✅ **Random Name Generation** - Themed names per game
- ✅ **Dark Mode Design** - Consistent UI/UX
- ✅ **Mobile-Friendly** - Responsive design
- ✅ **Spectator Mode** - Watch games in progress
- ✅ **Room Management** - Isolated game sessions

### Individual Games
**Pong**: Classic paddle game with collision physics  
**Snake**: Food collection with direction queue system  
**Tic-tac-toe**: Turn-based strategy with spectator support

## 🔄 Development Workflow

```bash
# 1. Develop in not-yet-tested folder
cd games-not-yet-tested/new-game
npm start  # Individual development server

# 2. Create BaseGame implementation
# games-not-yet-tested/new-game/new-game-game.js

# 3. Move to active games when working
mv games-not-yet-tested/new-game games/

# 4. Move problematic games to tested folder
mv games/broken-game games-tested/
```

## 🎯 Philosophy

**Working Game First → Extract Packages → Unified Architecture**
- Build games that work individually
- Extract proven code into shared packages
- Integrate into unified server when stable
- No architectural guesswork - validate with real implementations

## 📊 Package System

Built on npm workspaces with `@tyler-arcade/*` scoped packages providing shared functionality across all games.