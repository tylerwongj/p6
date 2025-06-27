class GameHub {
  constructor() {
    this.gamesContainer = document.getElementById('games-grid')
    this.playerNameInput = document.getElementById('playerNameInput')
    this.randomizeBtn = document.getElementById('randomizeBtn')
    
    this.initializePlayerName()
    this.setupEventListeners()
    this.loadGames()
    
    // Refresh games list every 5 seconds
    setInterval(() => this.loadGames(), 5000)
  }

  initializePlayerName() {
    // Load saved name or generate random one
    const savedName = localStorage.getItem('tylerArcadePlayerName')
    if (savedName) {
      this.playerNameInput.value = savedName
    } else {
      this.generateRandomName()
    }
  }

  setupEventListeners() {
    // Save name when input changes
    this.playerNameInput.addEventListener('input', () => {
      const name = this.playerNameInput.value.trim()
      if (name) {
        localStorage.setItem('tylerArcadePlayerName', name)
      }
    })

    // Generate random name when button clicked
    this.randomizeBtn.addEventListener('click', () => {
      this.generateRandomName()
    })

    // Also save on enter key
    this.playerNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const name = this.playerNameInput.value.trim()
        if (name) {
          localStorage.setItem('tylerArcadePlayerName', name)
        }
      }
    })
  }

  generateRandomName() {
    const adjectives = ['Red', 'Blue', 'Fast', 'Quick', 'Cool', 'Super', 'Mega', 'Epic', 'Stinky', 'Cosmic', 'Swift', 'Bold', 'Clever', 'Mighty']
    const nouns = ['Knight', 'Wizard', 'Ninja', 'Racer', 'Player', 'Gamer', 'Hero', 'Master', 'Explorer', 'Warrior', 'Scout', 'Hunter', 'Ranger', 'Pilot']
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const randomName = `${adjective}${noun}`
    
    this.playerNameInput.value = randomName
    localStorage.setItem('tylerArcadePlayerName', randomName)
  }

  getPlayerName() {
    const name = this.playerNameInput.value.trim()
    if (name) {
      localStorage.setItem('tylerArcadePlayerName', name)
      return name
    }
    
    // Generate name if empty
    this.generateRandomName()
    return this.playerNameInput.value
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