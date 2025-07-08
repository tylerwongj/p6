// Socket.io loaded from script tag

class AzulClient {
  constructor() {
    this.socket = io()
    this.playerId = null
    this.playerName = null
    this.gameState = null
    this.selectedFactory = null
    this.selectedSource = null // 'factory' or 'center'
    
    this.setupSocketEvents()
    this.setupUI()
  }

  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('Connected to server')
      // Auto-join when connected
      let playerName;
      if (typeof TylerArcadePlayer !== 'undefined' && TylerArcadePlayer.autoJoinGame) {
        playerName = TylerArcadePlayer.autoJoinGame(this.socket, 'azul-complete');
      } else {
        playerName = this.generateRandomName();
        this.socket.emit('joinGame', { 
          name: playerName, 
          roomId: 'azul-complete' 
        });
      }
      this.playerName = playerName;
    })

    this.socket.on('gameState', (state) => {
      this.gameState = state
      this.updateUI()
    })

    // BaseGame pattern - handle playerAssigned event
    this.socket.on('playerAssigned', (data) => {
      this.playerId = data.playerId
      this.playerName = data.playerName
    })

    // BaseGame pattern - handle joinFailed event
    this.socket.on('joinFailed', (data) => {
      console.log('Join failed:', data.reason)
    })

    // Legacy support for playerJoined
    this.socket.on('playerJoined', (data) => {
      if (data.success) {
        this.playerId = data.playerData.playerId
        this.playerName = data.playerData.playerName
      } else {
        console.log('Join failed:', data.reason)
      }
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server')
    })
  }

  setupUI() {
    // No playerNameInput in this game - auto-join handled in socket connect
  }

  generateRandomName() {
    const randomNames = ['TileMaster', 'AzulAce', 'PatternPro', 'WallBuilder', 'ColorCrafter', 'TileArtist', 'MosaicMaker']
    return randomNames[Math.floor(Math.random() * randomNames.length)] + Math.floor(Math.random() * 100)
  }

  updateUI() {
    if (!this.gameState) return

    this.updateHeader()
    this.updateScreens()
  }

  updateHeader() {
    document.getElementById('roundInfo').textContent = `Round ${this.gameState.round}`
    
    if (this.gameState.gamePhase === 'playing') {
      const currentPlayerName = this.gameState.players[this.gameState.currentPlayer]?.name || 'Unknown'
      if (this.gameState.currentPlayer === this.playerId) {
        document.getElementById('currentPlayerInfo').textContent = 'Your turn'
      } else {
        document.getElementById('currentPlayerInfo').textContent = `${currentPlayerName}'s turn`
      }
    }
  }

  updateScreens() {
    const waitingScreen = document.getElementById('waitingScreen')
    const gameOverScreen = document.getElementById('gameOverScreen')
    const leftPanel = document.getElementById('leftPanel')
    const playerBoard = document.getElementById('playerBoard')
    const otherPlayers = document.getElementById('otherPlayers')

    // Hide all screens
    waitingScreen.style.display = 'none'
    gameOverScreen.style.display = 'none'
    leftPanel.style.display = 'none'
    playerBoard.style.display = 'none'
    otherPlayers.style.display = 'none'

    switch (this.gameState.gamePhase) {
      case 'waiting':
        waitingScreen.style.display = 'flex'
        this.updateWaitingScreen()
        break
        
      case 'playing':
        leftPanel.style.display = 'block'
        playerBoard.style.display = 'block'
        otherPlayers.style.display = 'block'
        this.updatePlayingScreen()
        break
        
      case 'gameOver':
        gameOverScreen.style.display = 'flex'
        this.updateGameOverScreen()
        break
    }
  }

  updateWaitingScreen() {
    const startBtn = document.getElementById('startBtn')
    
    if (this.gameState.players.length >= 2) {
      startBtn.style.display = 'inline-block'
    } else {
      startBtn.style.display = 'none'
    }
  }

  updatePlayingScreen() {
    this.updateFactories()
    this.updateCenter()
    this.updateMyBoard()
    this.updateOtherPlayers()
  }

  updateFactories() {
    const factoriesGrid = document.getElementById('factoriesGrid')
    factoriesGrid.innerHTML = ''
    
    this.gameState.factories.forEach((factory, index) => {
      const factoryEl = document.createElement('div')
      factoryEl.className = 'factory'
      factoryEl.dataset.index = index
      
      if (factory.length === 0) {
        factoryEl.classList.add('empty')
      }
      
      // Group tiles by color and show them
      const tileGroups = {}
      factory.forEach(tile => {
        tileGroups[tile] = (tileGroups[tile] || 0) + 1
      })
      
      Object.entries(tileGroups).forEach(([color, count]) => {
        for (let i = 0; i < count; i++) {
          const tile = document.createElement('div')
          tile.className = `tile ${color}`
          factoryEl.appendChild(tile)
        }
      })
      
      factoryEl.addEventListener('click', () => {
        if (this.gameState.currentPlayer === this.playerId && factory.length > 0) {
          this.selectFactory(index)
        }
      })
      
      factoriesGrid.appendChild(factoryEl)
    })
  }

  updateCenter() {
    const centerArea = document.getElementById('centerArea')
    centerArea.innerHTML = ''
    
    // Group tiles by color
    const tileGroups = {}
    this.gameState.centerOfTable.forEach(tile => {
      tileGroups[tile] = (tileGroups[tile] || 0) + 1
    })
    
    Object.entries(tileGroups).forEach(([color, count]) => {
      for (let i = 0; i < count; i++) {
        const tile = document.createElement('div')
        tile.className = `tile ${color}`
        centerArea.appendChild(tile)
      }
    })
    
    centerArea.addEventListener('click', () => {
      if (this.gameState.currentPlayer === this.playerId && this.gameState.centerOfTable.length > 0) {
        this.selectCenter()
      }
    })
  }

  updateMyBoard() {
    const myBoard = document.getElementById('myBoard')
    const myPlayer = this.gameState.players[this.playerId]
    
    if (!myPlayer) return
    
    // Update active state
    if (this.gameState.currentPlayer === this.playerId) {
      myBoard.classList.add('active')
    } else {
      myBoard.classList.remove('active')
    }
    
    // Update score
    document.getElementById('myScore').textContent = `Score: ${myPlayer.score}`
    
    // Update pattern lines
    this.updatePatternLines(myPlayer)
    
    // Update wall
    this.updateWall(myPlayer)
    
    // Update floor line
    this.updateFloorLine(myPlayer)
  }

  updatePatternLines(player) {
    const patternLines = document.getElementById('patternLines')
    patternLines.innerHTML = ''
    
    player.patternLines.forEach((line, index) => {
      const lineEl = document.createElement('div')
      lineEl.className = 'pattern-line'
      lineEl.dataset.index = index
      
      // Create slots
      const slotsEl = document.createElement('div')
      slotsEl.className = 'line-slots'
      
      for (let i = 0; i < line.slots; i++) {
        const slot = document.createElement('div')
        slot.className = 'line-slot'
        
        if (i < line.tiles.length) {
          slot.classList.add('filled', line.type)
        }
        
        slotsEl.appendChild(slot)
      }
      
      lineEl.appendChild(slotsEl)
      
      // Add click handler for placing tiles
      lineEl.addEventListener('click', () => {
        if (this.selectedTiles && this.canPlaceOnLine(index, this.selectedTiles[0])) {
          this.placeTilesOnLine(index)
        }
      })
      
      patternLines.appendChild(lineEl)
    })
  }

  updateWall(player) {
    const wallGrid = document.getElementById('wallGrid')
    wallGrid.innerHTML = ''
    
    const colorOrder = ['blue', 'yellow', 'red', 'black', 'white']
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = document.createElement('div')
        cell.className = 'wall-cell'
        
        const colorIndex = (row + col) % 5
        const expectedColor = colorOrder[colorIndex]
        
        if (player.wall[row][col]) {
          cell.classList.add('filled', expectedColor)
        }
        
        wallGrid.appendChild(cell)
      }
    }
  }

  updateFloorLine(player) {
    const floorLine = document.getElementById('floorLine')
    floorLine.innerHTML = ''
    
    player.floorLine.forEach(tile => {
      const tileEl = document.createElement('div')
      tileEl.className = `tile ${tile}`
      floorLine.appendChild(tileEl)
    })
  }

  updateOtherPlayers() {
    const otherPlayers = document.getElementById('otherPlayers')
    otherPlayers.innerHTML = ''
    
    this.gameState.players.forEach((player, index) => {
      if (index === this.playerId) return
      
      const playerEl = document.createElement('div')
      playerEl.className = 'other-player-board'
      
      if (this.gameState.currentPlayer === index) {
        playerEl.classList.add('active')
      }
      
      playerEl.innerHTML = `
        <div class="player-name">${player.name}</div>
        <div class="mini-wall" id="miniWall${index}"></div>
        <div class="mini-score">${player.score} pts</div>
      `
      
      otherPlayers.appendChild(playerEl)
      
      // Update mini wall
      this.updateMiniWall(player, index)
    })
  }

  updateMiniWall(player, playerId) {
    const miniWall = document.getElementById(`miniWall${playerId}`)
    if (!miniWall) return
    
    miniWall.innerHTML = ''
    
    const colorOrder = ['blue', 'yellow', 'red', 'black', 'white']
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = document.createElement('div')
        cell.className = 'mini-wall-cell'
        
        const colorIndex = (row + col) % 5
        const expectedColor = colorOrder[colorIndex]
        
        if (player.wall[row][col]) {
          cell.classList.add('filled', expectedColor)
        }
        
        miniWall.appendChild(cell)
      }
    }
  }

  updateGameOverScreen() {
    const winnerAnnouncement = document.getElementById('winnerAnnouncement')
    const finalScores = document.getElementById('finalScores')
    
    if (this.gameState.winner !== -1) {
      const winnerName = this.gameState.players[this.gameState.winner].name
      winnerAnnouncement.textContent = `🎉 ${winnerName} Wins! 🎉`
    } else {
      winnerAnnouncement.textContent = '🎉 It\'s a Tie! 🎉'
    }
    
    finalScores.innerHTML = ''
    
    // Sort players by score
    const sortedPlayers = [...this.gameState.players].sort((a, b) => b.score - a.score)
    
    sortedPlayers.forEach(player => {
      const scoreCard = document.createElement('div')
      scoreCard.className = 'final-score-card'
      
      if (this.gameState.winner !== -1 && player.playerId === this.gameState.winner) {
        scoreCard.classList.add('winner')
      }
      
      scoreCard.innerHTML = `
        <div class="player-name">${player.name}</div>
        <div class="score-number">${player.score} points</div>
      `
      
      finalScores.appendChild(scoreCard)
    })
  }

  selectFactory(factoryIndex) {
    this.selectedFactory = factoryIndex
    this.selectedSource = 'factory'
    this.showTileSelection(this.gameState.factories[factoryIndex])
  }

  selectCenter() {
    this.selectedSource = 'center'
    this.showTileSelection(this.gameState.centerOfTable)
  }

  showTileSelection(tiles) {
    const tileSelection = document.getElementById('tileSelection')
    const tileColors = document.getElementById('tileColors')
    
    tileColors.innerHTML = ''
    
    // Get unique colors
    const uniqueColors = [...new Set(tiles.filter(tile => tile !== 'first'))]
    
    uniqueColors.forEach(color => {
      const colorOption = document.createElement('div')
      colorOption.className = `color-option ${color}`
      colorOption.addEventListener('click', () => {
        this.selectColor(color)
      })
      tileColors.appendChild(colorOption)
    })
    
    tileSelection.style.display = 'block'
  }

  selectColor(color) {
    if (this.selectedSource === 'factory') {
      this.socket.emit('customEvent', 'takeFromFactory', {
        factoryIndex: this.selectedFactory,
        color: color
      })
    } else if (this.selectedSource === 'center') {
      this.socket.emit('customEvent', 'takeFromCenter', {
        color: color
      })
    }
    
    this.closeTileSelection()
  }

  closeTileSelection() {
    document.getElementById('tileSelection').style.display = 'none'
    this.selectedFactory = null
    this.selectedSource = null
  }

  canPlaceOnLine(lineIndex, color) {
    const myPlayer = this.gameState.players[this.playerId]
    if (!myPlayer) return false
    
    const line = myPlayer.patternLines[lineIndex]
    
    // Check if line is empty or has same color
    if (line.tiles.length > 0 && line.type !== color) {
      return false
    }
    
    // Check if color is already on wall in this row
    const colorOrder = ['blue', 'yellow', 'red', 'black', 'white']
    const colorIndex = colorOrder.indexOf(color)
    const wallPosition = (lineIndex + colorIndex) % 5
    
    return !myPlayer.wall[lineIndex][wallPosition]
  }

  placeTilesOnLine(lineIndex) {
    this.socket.emit('customEvent', 'placeTiles', {
      tiles: this.selectedTiles,
      lineIndex: lineIndex
    })
    
    this.selectedTiles = null
  }

  startGame() {
    this.socket.emit('customEvent', 'startGame')
  }
}

// Make functions global for HTML onclick handlers
window.startGame = () => game.startGame()
window.closeTileSelection = () => game.closeTileSelection()

// Initialize game
const game = new AzulClient()