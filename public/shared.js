/**
 * Tyler Arcade - Shared utilities for all games
 */

class TylerArcadePlayer {
  static getPlayerName() {
    const saved = localStorage.getItem('tylerArcadePlayerName')
    if (saved && saved.trim()) {
      return saved.trim()
    }
    
    // Generate random name if none exists
    const name = this.generateRandomName()
    localStorage.setItem('tylerArcadePlayerName', name)
    return name
  }

  static generateRandomName() {
    const adjectives = ['Red', 'Blue', 'Fast', 'Quick', 'Cool', 'Super', 'Mega', 'Epic', 'Stinky', 'Cosmic', 'Swift', 'Bold', 'Clever', 'Mighty']
    const nouns = ['Knight', 'Wizard', 'Ninja', 'Racer', 'Player', 'Gamer', 'Hero', 'Master', 'Explorer', 'Warrior', 'Scout', 'Hunter', 'Ranger', 'Pilot']
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    
    return `${adjective}${noun}`
  }

  static setPlayerName(name) {
    if (name && name.trim()) {
      localStorage.setItem('tylerArcadePlayerName', name.trim())
    }
  }

  static createPlayerNameDisplay() {
    const playerName = this.getPlayerName()
    
    // Create player name display element
    const nameDisplay = document.createElement('div')
    nameDisplay.className = 'player-name-display'
    nameDisplay.innerHTML = `
      <span class="player-label">Player:</span>
      <span class="player-name">${playerName}</span>
    `
    
    // Add styles
    this.addPlayerNameStyles()
    
    // Position in top-right
    nameDisplay.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      z-index: 900;
      font-family: Arial, sans-serif;
    `
    
    return nameDisplay
  }

  static addPlayerNameStyles() {
    if (document.getElementById('tyler-arcade-styles')) return
    
    const style = document.createElement('style')
    style.id = 'tyler-arcade-styles'
    style.textContent = `
      .player-name-display .player-label {
        color: #ccc;
        font-size: 12px;
        margin-right: 5px;
      }
      .player-name-display .player-name {
        color: #00ff88;
        font-size: 14px;
        font-weight: bold;
      }
    `
    document.head.appendChild(style)
  }

  static autoJoinGame(socket, gameRoomId) {
    const playerName = this.getPlayerName()
    console.log(`Auto-joining ${gameRoomId} as ${playerName}`)
    
    // Add player name display to page
    const nameDisplay = this.createPlayerNameDisplay()
    document.body.appendChild(nameDisplay)
    
    // Auto-join the game
    socket.emit('joinGame', { name: playerName, roomId: gameRoomId })
    
    return playerName
  }
}

// Make available globally
window.TylerArcadePlayer = TylerArcadePlayer