# Tyler Arcade Development Notes

## 🎯 Project Goals
- Create a comprehensive game hub - "tyler-arcade"
- Transform popular games into engaging multiplayer experiences
- Target games: Wordle, Pong, Tic-tac-toe, Frogger, Skribbl.io, etc.
- Possibility of creating 3D games later
- Prioritize exceptional UI/UX design - games should look and feel amazing
- Focus on real-time multiplayer functionality and smooth gameplay
- Build modular, scalable architecture for easy game additions

## 🏗️ Architecture Philosophy

**Working Game First → Extract Packages**
- Build games that work
- Extract proven, working code into packages  
- Test each extraction step
- No guessing if architecture works

## ✅ Current Status (Phase 1 Complete)

### What We Built
1. **Clean p6 workspace** - npm workspaces setup
2. **@tyler-arcade/core package** - minimal but functional
   - `GameLoop`: requestAnimationFrame-based game loop
   - `Canvas2D`: Simple 2D rendering wrapper
   - `EventBus`: Pub/sub event system
3. **Working Pong game** - real multiplayer using core package
4. **Validated approach** - core package works in real game

### Pong Game Features
- ✅ Real-time multiplayer with Socket.io
- ✅ Spectator mode for newcomers  
- ✅ Random name generation (RedKnight, StinkyExplorer, etc.)
- ✅ Mobile-friendly popup UI overlay
- ✅ Dark theme by default
- ✅ Players see game immediately, popup to join
- ✅ No room codes needed - join main room
- ✅ 60 FPS smooth gameplay
- ✅ Controls: W/S or Arrow Keys, Space to start ball

## 🔄 Next Phase: Incremental Package Extraction

Extract packages one at a time from working Pong game:

### Phase 2A: @tyler-arcade/2d-input
Extract input handling from Pong:
- Unified keyboard/mouse/touch/gamepad input
- Virtual joystick for mobile
- Key bindings system
- **Test**: Verify Pong still works with package

### Phase 2B: @tyler-arcade/2d-physics  
Extract collision/movement from Pong:
- Vector2D math utilities
- Rectangle/Circle collision shapes
- Collision detection algorithms
- Simple physics simulation
- **Test**: Verify Pong physics still work

### Phase 2C: @tyler-arcade/multiplayer
Extract networking from Pong:
- Socket.io wrapper with rooms
- Client connection with auto-reconnect
- State synchronization with delta compression
- Room management system
- **Test**: Verify multiplayer still works

### Phase 2D: @tyler-arcade/2d-renderer
Extract rendering from Pong:
- Advanced Canvas2D operations
- Sprite rendering with animations
- Particle systems for effects
- Camera2D with viewport management
- **Test**: Verify visuals still work

### Phase 2E: @tyler-arcade/ui
Extract UI components:
- Reusable menu system
- HUD components (score, lives, timers)
- Dialog/popup system
- Leaderboard display
- **Test**: Verify UI still works

## 🎮 Game Development Guidelines

### UI/UX Requirements
- Single screen design that fits in viewport without scrolling
- Join popup overlays main game while players can see others play
- Dark mode by default (Dark Reader type settings: -10 Contrast)
- Players see game when they reach server
- Name input popup (not separate screen)
- Generate random names if none entered
- Optional room codes (default to MAIN room)
- Standby mode UI when game hasn't started
- Allow early control testing/chat while waiting

### 3D Game Controls (Future)
- Camera controls: JKLI keys
  - J/L: left/right
  - K/I: up/down

### Technical Stack
- **Frontend**: HTML5 Canvas + JavaScript
- **Backend**: Node.js + Express + Socket.io
- **Deployment**: Railway (free tier)
- **Networking**: WebSocket-based real-time sync
- **Performance**: Client-side prediction and interpolation
- **Testing**: ngrok for multiplayer testing

## 📁 Current Structure

```
p6/
├── packages/               # Shared packages
│   └── core/              # @tyler-arcade/core
│       ├── src/
│       │   ├── GameLoop.js    # Game loop management
│       │   ├── Canvas2D.js    # Basic 2D rendering
│       │   ├── EventBus.js    # Event system
│       │   └── index.js       # Package exports
│       └── package.json
├── games/                 # Individual games
│   └── pong/             # First test game
│       ├── public/
│       │   ├── index.html     # Game interface
│       │   └── game.js        # Client-side game
│       ├── server.js          # Multiplayer server
│       └── package.json
├── package.json          # Workspace root
└── README.md            # Project overview
```

## 🎯 Development Principles

1. **DRY**: No code duplication between packages
2. **Single Responsibility**: Each package has one clear purpose
3. **Zero Dependencies**: Minimize external dependencies
4. **TypeScript Support**: JSDoc types for better IDE support
5. **Test Coverage**: Unit tests for critical functionality
6. **Documentation**: Clear examples for each package
7. **Incremental**: Extract working code, don't build theoretical packages

## 🚀 Quick Commands

```bash
# Start Pong game
cd games/pong
npm start
# Open http://localhost:3000

# Install all workspace dependencies
npm install

# Add new game
mkdir games/new-game
cd games/new-game
npm init
# Add "@tyler-arcade/core": "file:../../packages/core" to dependencies
```

## 📋 TODO: Next Steps

1. **Extract @tyler-arcade/2d-input** from Pong
   - Move input handling code to package
   - Update Pong to use package
   - Test multiplayer still works
   
2. **Extract @tyler-arcade/2d-physics** from Pong
   - Move collision detection to package
   - Update Pong physics to use package
   - Test physics still work
   
3. **Build second game** (Snake or Tic-tac-toe)
   - Use all extracted packages
   - Validate package reusability
   
4. **Create tyler-arcade-hub**
   - Main entry point with game selection
   - Consistent UI/UX across games
   - Dynamic game loading

## 💡 Key Insights

- **Minimal viable approach works**: Started with tiny core package, built working game
- **Real validation**: Pong proves the architecture works for multiplayer games
- **Incremental is safer**: Extract from working code vs. building theoretical packages
- **Socket.io integration**: Clean separation between client/server game logic
- **Mobile-first UI**: Popup overlay design works great for mobile players

---

*This project started from analyzing 70+ games in p4, decided to build clean modular packages from scratch in p6. The incremental "working game first" approach has been validated with Pong.*