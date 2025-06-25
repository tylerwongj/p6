# Tyler Arcade - Modular Game Development

A clean, modular approach to building multiplayer arcade games.

## 🎮 Current Status

✅ **Core Package Built** - Minimal game engine components  
✅ **Pong Game Working** - First test game using the core package  
🔄 **Next**: Extract more packages incrementally from working games

## 🚀 Quick Start

```bash
# Start Pong game
cd games/pong
npm start

# Open in browser
open http://localhost:3000
```

## 📁 Structure

```
p6/
├── packages/               # Shared packages
│   └── core/              # @tyler-arcade/core - GameLoop, Canvas2D, EventBus
├── games/                 # Individual games
│   └── pong/             # First test game
└── package.json          # Workspace root
```

## 🧱 Package Architecture

### Current: @tyler-arcade/core
- **GameLoop**: requestAnimationFrame-based game loop
- **Canvas2D**: Simple 2D rendering wrapper  
- **EventBus**: Pub/sub event system

### Next: Extract from Pong
1. **@tyler-arcade/2d-input** - Input handling
2. **@tyler-arcade/2d-physics** - Collision detection
3. **@tyler-arcade/multiplayer** - Networking

## 🎯 Philosophy

**Working Game First → Extract Packages**
- Build games that work
- Extract proven, working code into packages
- Test each extraction step
- No guessing if architecture works

## 🎮 Pong Game Features

- ✅ Real-time multiplayer
- ✅ Spectator mode  
- ✅ Random name generation
- ✅ Dark theme
- ✅ Mobile-friendly popup UI
- ✅ Socket.io networking
- ✅ Smooth 60 FPS gameplay

**Controls**: W/S or Arrow Keys, Space to start ball

This validates our core package works perfectly for real games!