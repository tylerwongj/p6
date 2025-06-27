export class WaitingScreen {
  constructor(options = {}) {
    this.container = options.container || document.body
    this.gameName = options.gameName || 'Game'
    this.minPlayers = options.minPlayers || 2
    this.maxPlayers = options.maxPlayers || 4
    this.element = null
    this.currentPlayers = []
  }

  show() {
    if (this.element) return

    this.element = document.createElement('div')
    this.element.className = 'waiting-screen'
    this.addStyles()
    this.container.appendChild(this.element)
    this.update()
  }

  update(players = []) {
    this.currentPlayers = players
    if (!this.element) return

    const playersNeeded = Math.max(0, this.minPlayers - players.length)
    const canStart = players.length >= this.minPlayers

    this.element.innerHTML = `
      <div class="waiting-content">
        <h2>Waiting for Players</h2>
        <div class="game-info">
          <div class="game-name">${this.gameName}</div>
          <div class="player-count">
            ${players.length}/${this.maxPlayers} players
          </div>
        </div>
        
        <div class="players-list">
          ${players.map(player => `
            <div class="player-item">
              <span class="player-icon">👤</span>
              <span class="player-name">${player.name || player.id}</span>
            </div>
          `).join('')}
          
          ${Array.from({length: this.maxPlayers - players.length}, (_, i) => `
            <div class="player-item empty">
              <span class="player-icon">⭕</span>
              <span class="player-name">Waiting for player...</span>
            </div>
          `).join('')}
        </div>

        <div class="status-message">
          ${canStart 
            ? '<div class="ready">Ready to start!</div>' 
            : `<div class="waiting">Need ${playersNeeded} more player${playersNeeded !== 1 ? 's' : ''}</div>`
          }
        </div>

        <div class="loading-animation">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    `
  }

  hide() {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }

  addStyles() {
    if (document.querySelector('#waiting-screen-styles')) return

    const style = document.createElement('style')
    style.id = 'waiting-screen-styles'
    style.textContent = `
      .waiting-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        color: white;
        font-family: Arial, sans-serif;
      }
      .waiting-content {
        background: #1a1a1a;
        border: 2px solid #444;
        border-radius: 15px;
        padding: 40px;
        text-align: center;
        max-width: 400px;
        width: 90%;
      }
      .waiting-content h2 {
        margin: 0 0 20px 0;
        color: #fff;
        font-size: 24px;
      }
      .game-info {
        margin-bottom: 30px;
      }
      .game-name {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 5px;
        color: #4CAF50;
      }
      .player-count {
        font-size: 14px;
        color: #aaa;
      }
      .players-list {
        margin: 20px 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .player-item {
        display: flex;
        align-items: center;
        padding: 10px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        text-align: left;
      }
      .player-item.empty {
        opacity: 0.5;
        background: rgba(255, 255, 255, 0.05);
      }
      .player-icon {
        margin-right: 10px;
        font-size: 16px;
      }
      .player-name {
        flex: 1;
      }
      .status-message {
        margin: 20px 0;
        font-size: 16px;
      }
      .ready {
        color: #4CAF50;
        font-weight: bold;
      }
      .waiting {
        color: #ffa726;
      }
      .loading-animation {
        display: flex;
        justify-content: center;
        gap: 5px;
        margin-top: 20px;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4CAF50;
        animation: loading 1.4s infinite ease-in-out both;
      }
      .dot:nth-child(1) { animation-delay: -0.32s; }
      .dot:nth-child(2) { animation-delay: -0.16s; }
      @keyframes loading {
        0%, 80%, 100% { 
          transform: scale(0);
        } 40% { 
          transform: scale(1);
        }
      }
    `
    document.head.appendChild(style)
  }
}