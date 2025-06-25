class GameHub {
  constructor() {
    this.gamesContainer = document.getElementById('games-grid')
    this.loadGames()
    
    // Refresh games list every 5 seconds
    setInterval(() => this.loadGames(), 5000)
  }

  async loadGames() {
    try {
      const response = await fetch('/api/games')
      const games = await response.json()
      this.renderGames(games)
    } catch (error) {
      console.error('Failed to load games:', error)
      this.gamesContainer.innerHTML = '<div class="loading">Failed to load games</div>'
    }
  }

  renderGames(games) {
    if (games.length === 0) {
      this.gamesContainer.innerHTML = '<div class="loading">No games available</div>'
      return
    }

    this.gamesContainer.innerHTML = games.map(game => `
      <div class="game-card" onclick="gameHub.joinGame('${game.id}')">
        <div class="game-title">${this.capitalize(game.name)}</div>
        <div class="game-description">${game.description}</div>
        <div class="game-status">
          <span class="players-count">${game.players}/${game.maxPlayers} players</span>
          <span class="status-badge ${this.getStatusClass(game)}">
            ${this.getStatusText(game)}
          </span>
        </div>
      </div>
    `).join('')
  }

  getStatusClass(game) {
    if (game.players >= game.maxPlayers) {
      return 'status-full'
    }
    return 'status-available'
  }

  getStatusText(game) {
    if (game.players >= game.maxPlayers) {
      return 'FULL'
    }
    if (game.players > 0) {
      return 'PLAYING'
    }
    return 'AVAILABLE'
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  joinGame(gameId) {
    // Navigate to the game
    window.location.href = `/${gameId}`
  }
}

// Initialize the game hub
const gameHub = new GameHub()