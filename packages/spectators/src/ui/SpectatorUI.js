export class SpectatorUI {
  constructor(options = {}) {
    this.container = options.container || document.body
    this.spectatorCount = 0
    this.canJoinAsPlayer = false
    this.onJoinAsPlayer = options.onJoinAsPlayer || (() => {})
    this.element = null
  }

  show() {
    if (this.element) return

    this.element = document.createElement('div')
    this.element.className = 'spectator-ui'
    this.update()
    this.addStyles()
    this.container.appendChild(this.element)
  }

  update(data = {}) {
    if (data.spectatorCount !== undefined) this.spectatorCount = data.spectatorCount
    if (data.canJoinAsPlayer !== undefined) this.canJoinAsPlayer = data.canJoinAsPlayer

    if (!this.element) return

    this.element.innerHTML = `
      <div class="spectator-info">
        <span class="spectator-icon">👁️</span>
        <span class="spectator-text">Spectating</span>
        <span class="spectator-count">${this.spectatorCount} watching</span>
        ${this.canJoinAsPlayer ? '<button class="join-player-btn">Join Game</button>' : ''}
      </div>
    `

    if (this.canJoinAsPlayer) {
      const joinBtn = this.element.querySelector('.join-player-btn')
      joinBtn.addEventListener('click', () => this.onJoinAsPlayer())
    }
  }

  hide() {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }

  addStyles() {
    if (document.querySelector('#spectator-ui-styles')) return

    const style = document.createElement('style')
    style.id = 'spectator-ui-styles'
    style.textContent = `
      .spectator-ui {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 100;
      }
      .spectator-info {
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #444;
        border-radius: 8px;
        padding: 10px 15px;
        color: white;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
      }
      .spectator-icon {
        font-size: 16px;
      }
      .spectator-text {
        font-weight: bold;
      }
      .spectator-count {
        color: #aaa;
        font-size: 12px;
      }
      .join-player-btn {
        background: #4CAF50;
        border: none;
        border-radius: 4px;
        color: white;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }
      .join-player-btn:hover {
        background: #45a049;
      }
    `
    document.head.appendChild(style)
  }
}