import { BaseGame } from '@tyler-arcade/multiplayer'

export class AzulCompleteGame extends BaseGame {
  constructor() {
    super()
    this.name = 'Azul Complete'
    this.description = 'Strategic tile placement game for 2-4 players'
    this.maxPlayers = 4
    this.spectators = [] // Required for BaseGame
    this.players = [] // Override with Array structure
    
    // Game state
    this.gamePhase = 'waiting'
    this.currentPlayer = 0
    this.round = 1
    this.factories = []
    this.centerOfTable = []
    this.firstPlayerMarker = true
    this.bag = []
    this.discardPile = []
    this.gameOver = false
    this.winner = -1
    this.tileColors = ['blue', 'yellow', 'red', 'black', 'white']
    
    this.initializeTiles()
  }

  initializeTiles() {
    // 100 tiles total: 20 of each color
    this.bag = []
    this.tileColors.forEach(color => {
      for (let i = 0; i < 20; i++) {
        this.bag.push(color)
      }
    })
    this.shuffleBag()
  }

  shuffleBag() {
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
    }
  }

  handlePlayerJoin(socketId, playerName, roomId, socket) {
    // Room validation
    if (roomId !== 'azul-complete') {
      return {
        success: false,
        reason: 'Wrong room - this is Azul Complete'
      }
    }

    // Check if game is full
    if (this.players.length >= this.maxPlayers) {
      return {
        success: false,
        reason: 'Game is full (max 4 players)'
      }
    }

    // Add player
    const playerId = this.players.length
    const player = {
      id: socketId,
      name: playerName,
      playerId: playerId,
      score: 0,
      patternLines: [],
      wall: [],
      floorLine: []
    }
    
    this.players.push(player)
    
    // Send immediate game state to new player
    this.sendToPlayer(socketId, 'gameState', this.getGameState())
    
    return {
      success: true,
      playerData: { 
        playerId: playerId, 
        playerName: playerName 
      }
    }
  }

  handlePlayerLeave(socketId, player, socket) {
    const playerIndex = this.players.findIndex(p => p.id === socketId)
    if (playerIndex !== -1) {
      this.players.splice(playerIndex, 1)
      this.gamePhase = 'waiting'
      this.gameOver = false
    }
  }

  handleCustomEvent(socketId, eventName, args, socket) {
    const player = this.players.find(p => p.id === socketId)
    if (!player) return
    
    switch (eventName) {
      case 'startGame':
        if (this.gamePhase === 'waiting') {
          this.startGame()
        }
        break
        
      case 'takeFromFactory':
        this.takeTilesFromFactory(player.playerId, args.factoryIndex, args.color)
        break
        
      case 'takeFromCenter':
        this.takeTilesFromCenter(player.playerId, args.color)
        break
        
      case 'placeTiles':
        if (args.tiles && args.lineIndex !== undefined) {
          this.placeTiles(player.playerId, args.tiles, args.lineIndex)
        }
        break
    }
  }

  startGame() {
    if (this.players.length < 2 || this.players.length > 4) return false
    
    this.gamePhase = 'playing'
    this.currentPlayer = 0
    this.round = 1
    
    // Initialize player boards
    this.players.forEach(player => {
      player.score = 0
      player.patternLines = [
        { slots: 1, tiles: [], type: null },
        { slots: 2, tiles: [], type: null },
        { slots: 3, tiles: [], type: null },
        { slots: 4, tiles: [], type: null },
        { slots: 5, tiles: [], type: null }
      ]
      player.wall = Array(5).fill().map(() => Array(5).fill(false))
      player.floorLine = []
    })
    
    this.setupRound()
    return true
  }

  setupRound() {
    // Calculate number of factories (2 players = 5, 3 players = 7, 4 players = 9)
    const factoryCount = 2 * this.players.length + 1
    
    this.factories = []
    this.centerOfTable = []
    
    // Fill factories with 4 tiles each
    for (let i = 0; i < factoryCount; i++) {
      const factory = []
      for (let j = 0; j < 4; j++) {
        if (this.bag.length === 0) {
          this.refillBag()
        }
        if (this.bag.length > 0) {
          factory.push(this.bag.pop())
        }
      }
      this.factories.push(factory)
    }
    
    // Add first player marker to center
    if (this.firstPlayerMarker) {
      this.centerOfTable.push('first')
    }
  }

  refillBag() {
    this.bag = [...this.discardPile]
    this.discardPile = []
    this.shuffleBag()
  }

  takeTilesFromFactory(playerId, factoryIndex, color) {
    if (playerId !== this.currentPlayer) return false
    if (factoryIndex >= this.factories.length) return false
    
    const factory = this.factories[factoryIndex]
    const takenTiles = factory.filter(tile => tile === color)
    const remainingTiles = factory.filter(tile => tile !== color)
    
    if (takenTiles.length === 0) return false
    
    // Move remaining tiles to center
    this.centerOfTable.push(...remainingTiles)
    
    // Clear factory
    this.factories[factoryIndex] = []
    
    // Place tiles on player's pattern line or floor
    this.placeTiles(playerId, takenTiles)
    
    this.nextPlayer()
    return true
  }

  takeTilesFromCenter(playerId, color) {
    if (playerId !== this.currentPlayer) return false
    
    let takenTiles = []
    let newCenter = []
    let tookFirstPlayer = false
    
    this.centerOfTable.forEach(tile => {
      if (tile === color) {
        takenTiles.push(tile)
      } else if (tile === 'first') {
        tookFirstPlayer = true
        this.players[playerId].floorLine.push('first')
      } else {
        newCenter.push(tile)
      }
    })
    
    if (takenTiles.length === 0 && !tookFirstPlayer) return false
    
    this.centerOfTable = newCenter
    
    if (tookFirstPlayer) {
      this.firstPlayerMarker = false
    }
    
    if (takenTiles.length > 0) {
      this.placeTiles(playerId, takenTiles)
    }
    
    this.nextPlayer()
    return true
  }

  placeTiles(playerId, tiles, lineIndex = null) {
    if (lineIndex !== null) {
      // Player specified which line to use
      const line = this.players[playerId].patternLines[lineIndex]
      
      if (this.canPlaceOnLine(playerId, lineIndex, tiles[0])) {
        const canFit = Math.min(tiles.length, line.slots - line.tiles.length)
        
        // Add tiles to pattern line
        for (let i = 0; i < canFit; i++) {
          line.tiles.push(tiles[0])
        }
        line.type = tiles[0]
        
        // Overflow to floor
        for (let i = canFit; i < tiles.length; i++) {
          this.players[playerId].floorLine.push(tiles[i])
        }
      } else {
        // All tiles go to floor
        this.players[playerId].floorLine.push(...tiles)
      }
    } else {
      // Auto-place logic (or let client choose)
      // For now, send to floor if no line specified
      this.players[playerId].floorLine.push(...tiles)
    }
  }

  canPlaceOnLine(playerId, lineIndex, color) {
    const line = this.players[playerId].patternLines[lineIndex]
    const wall = this.players[playerId].wall
    
    // Check if line is empty or has same color
    if (line.tiles.length > 0 && line.type !== color) {
      return false
    }
    
    // Check if color is already on wall in this row
    const colorIndex = this.tileColors.indexOf(color)
    const wallPosition = (lineIndex + colorIndex) % 5
    
    return !wall[lineIndex][wallPosition]
  }

  nextPlayer() {
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length
    
    // Check if round is over (all factories empty and center empty)
    if (this.isRoundOver()) {
      this.endRound()
    }
  }

  isRoundOver() {
    const factoriesEmpty = this.factories.every(factory => factory.length === 0)
    const centerEmpty = this.centerOfTable.length === 0
    return factoriesEmpty && centerEmpty
  }

  endRound() {
    // Move tiles from pattern lines to wall
    this.players.forEach((player, playerId) => {
      player.patternLines.forEach((line, lineIndex) => {
        if (line.tiles.length === line.slots) {
          // Move one tile to wall
          const color = line.type
          const colorIndex = this.tileColors.indexOf(color)
          const wallPosition = (lineIndex + colorIndex) % 5
          
          player.wall[lineIndex][wallPosition] = color
          
          // Calculate points for this tile
          const points = this.calculateTilePoints(playerId, lineIndex, wallPosition)
          player.score += points
          
          // Discard remaining tiles
          this.discardPile.push(...line.tiles.slice(1))
          
          // Clear pattern line
          line.tiles = []
          line.type = null
        }
      })
      
      // Calculate floor penalties
      const floorPenalties = [-1, -1, -2, -2, -2, -3, -3]
      for (let i = 0; i < player.floorLine.length && i < floorPenalties.length; i++) {
        player.score += floorPenalties[i]
      }
      player.score = Math.max(0, player.score)
      
      // Clear floor line (except put tiles back in discard)
      player.floorLine.forEach(tile => {
        if (tile !== 'first') {
          this.discardPile.push(tile)
        }
      })
      player.floorLine = []
    })
    
    // Check for game end
    if (this.checkGameEnd()) {
      this.endGame()
    } else {
      // Setup next round
      this.round++
      this.determineFirstPlayer()
      this.setupRound()
    }
  }

  calculateTilePoints(playerId, row, col) {
    const wall = this.players[playerId].wall
    let points = 1
    
    // Count horizontal connected tiles
    let horizontal = 1
    
    // Count left
    for (let c = col - 1; c >= 0; c--) {
      if (wall[row][c]) horizontal++
      else break
    }
    
    // Count right
    for (let c = col + 1; c < 5; c++) {
      if (wall[row][c]) horizontal++
      else break
    }
    
    // Count vertical connected tiles
    let vertical = 1
    
    // Count up
    for (let r = row - 1; r >= 0; r--) {
      if (wall[r][col]) vertical++
      else break
    }
    
    // Count down
    for (let r = row + 1; r < 5; r++) {
      if (wall[r][col]) vertical++
      else break
    }
    
    if (horizontal > 1) points += horizontal - 1
    if (vertical > 1) points += vertical - 1
    
    return points
  }

  checkGameEnd() {
    // Game ends if any player has a complete horizontal line on their wall
    return this.players.some(player => 
      player.wall.some(row => row.every(cell => cell !== false))
    )
  }

  determineFirstPlayer() {
    // Player who took first player marker goes first
    const firstPlayerIndex = this.players.findIndex(player => 
      player.floorLine.includes('first')
    )
    
    if (firstPlayerIndex !== -1) {
      this.currentPlayer = firstPlayerIndex
      this.firstPlayerMarker = true
    }
  }

  endGame() {
    this.gamePhase = 'gameOver'
    this.gameOver = true
    
    // Calculate final bonus points
    this.players.forEach(player => {
      let bonus = 0
      
      // Horizontal line bonus (2 points each)
      player.wall.forEach(row => {
        if (row.every(cell => cell !== false)) {
          bonus += 2
        }
      })
      
      // Vertical line bonus (7 points each)
      for (let col = 0; col < 5; col++) {
        if (player.wall.every(row => row[col] !== false)) {
          bonus += 7
        }
      }
      
      // Color bonus (10 points each)
      this.tileColors.forEach(color => {
        let colorCount = 0
        player.wall.forEach(row => {
          row.forEach(cell => {
            if (cell === color) colorCount++
          })
        })
        if (colorCount === 5) {
          bonus += 10
        }
      })
      
      player.score += bonus
    })
    
    // Determine winner
    let maxScore = Math.max(...this.players.map(p => p.score))
    const winners = this.players.filter(p => p.score === maxScore)
    
    if (winners.length === 1) {
      this.winner = this.players.indexOf(winners[0])
    } else {
      // Tiebreaker: most complete horizontal lines
      let maxLines = Math.max(...winners.map(p => 
        p.wall.filter(row => row.every(cell => cell !== false)).length
      ))
      const tiebreakers = winners.filter(p => 
        p.wall.filter(row => row.every(cell => cell !== false)).length === maxLines
      )
      
      this.winner = this.players.indexOf(tiebreakers[0])
    }
  }

  // Required by unified server - called at 60 FPS
  update(deltaTime) {
    // Broadcast game state updates
    this.broadcast('gameState', this.getGameState())
  }

  getGameState() {
    return {
      players: this.players.map((player, index) => ({
        ...player,
        id: player.id,
        name: player.name,
        score: player.score,
        patternLines: player.patternLines,
        wall: player.wall,
        floorLine: player.floorLine
      })),
      gamePhase: this.gamePhase,
      currentPlayer: this.currentPlayer,
      round: this.round,
      factories: this.factories,
      centerOfTable: this.centerOfTable,
      gameOver: this.gameOver,
      winner: this.winner,
      tileColors: this.tileColors
    }
  }
}