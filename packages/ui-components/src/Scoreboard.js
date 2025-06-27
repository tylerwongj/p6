export class Scoreboard {
  constructor(options = {}) {
    this.container = options.container || document.body
    this.title = options.title || 'Scores'
    this.showRank = options.showRank !== false
    this.maxVisible = options.maxVisible || 10
    this.element = null
    this.scores = []
  }

  show() {
    if (this.element) return

    this.element = document.createElement('div')
    this.element.className = 'scoreboard'
    this.addStyles()
    this.container.appendChild(this.element)
    this.update()
  }

  update(scores = []) {
    this.scores = scores
    if (!this.element) return

    const sortedScores = [...scores].sort((a, b) => b.score - a.score)
    const visibleScores = sortedScores.slice(0, this.maxVisible)

    this.element.innerHTML = `
      <div class="scoreboard-header">
        <h3>${this.title}</h3>
      </div>
      <div class="scoreboard-list">
        ${visibleScores.map((entry, index) => `
          <div class="score-entry ${entry.isCurrentPlayer ? 'current-player' : ''}">
            ${this.showRank ? `<span class="rank">#${index + 1}</span>` : ''}
            <span class="player-name">${entry.name || entry.playerId}</span>
            <span class="score">${entry.score}</span>
          </div>
        `).join('')}
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
    if (document.querySelector('#scoreboard-styles')) return

    const style = document.createElement('style')
    style.id = 'scoreboard-styles'
    style.textContent = `
      .scoreboard {
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #444;
        border-radius: 10px;
        padding: 15px;
        color: white;
        font-family: Arial, sans-serif;
        min-width: 200px;
        z-index: 100;
      }
      .scoreboard-header h3 {
        margin: 0 0 10px 0;
        text-align: center;
        color: #fff;
        font-size: 16px;
      }
      .scoreboard-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .score-entry {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5px 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.05);
        font-size: 14px;
      }
      .score-entry.current-player {
        background: rgba(76, 175, 80, 0.3);
        border: 1px solid #4CAF50;
      }
      .rank {
        font-weight: bold;
        color: #ffd700;
        min-width: 25px;
      }
      .player-name {
        flex: 1;
        text-align: left;
        margin-left: 8px;
      }
      .score {
        font-weight: bold;
        color: #4CAF50;
      }
    `
    document.head.appendChild(style)
  }
}