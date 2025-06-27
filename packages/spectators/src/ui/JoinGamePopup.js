export class JoinGamePopup {
  constructor(options = {}) {
    this.gameName = options.gameName || 'Game'
    this.onJoin = options.onJoin || (() => {})
    this.generateRandomName = options.generateRandomName || this.defaultRandomName
    this.element = null
  }

  show() {
    if (this.element) return

    this.element = document.createElement('div')
    this.element.className = 'join-popup-overlay'
    this.element.innerHTML = `
      <div class="join-popup">
        <h2>Join ${this.gameName}</h2>
        <input type="text" id="playerName" placeholder="Enter your name (optional)" maxlength="20">
        <button id="joinBtn">JOIN</button>
        <p class="hint">Leave name empty for random name</p>
      </div>
    `

    this.addStyles()
    document.body.appendChild(this.element)

    const nameInput = this.element.querySelector('#playerName')
    const joinBtn = this.element.querySelector('#joinBtn')

    nameInput.focus()
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleJoin()
    })
    joinBtn.addEventListener('click', () => this.handleJoin())
  }

  handleJoin() {
    const nameInput = this.element.querySelector('#playerName')
    const playerName = nameInput.value.trim() || this.generateRandomName()
    this.onJoin(playerName)
    this.hide()
  }

  hide() {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }

  defaultRandomName() {
    const adjectives = ['Red', 'Blue', 'Swift', 'Brave', 'Clever', 'Mighty', 'Quick', 'Stinky', 'Sneaky', 'Bold']
    const nouns = ['Knight', 'Explorer', 'Wizard', 'Ranger', 'Hunter', 'Warrior', 'Scout', 'Ninja', 'Hero', 'Player']
    return adjectives[Math.floor(Math.random() * adjectives.length)] + 
           nouns[Math.floor(Math.random() * nouns.length)]
  }

  addStyles() {
    if (document.querySelector('#join-popup-styles')) return

    const style = document.createElement('style')
    style.id = 'join-popup-styles'
    style.textContent = `
      .join-popup-overlay {
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
      }
      .join-popup {
        background: #1a1a1a;
        border: 2px solid #444;
        border-radius: 10px;
        padding: 30px;
        text-align: center;
        color: white;
        min-width: 300px;
      }
      .join-popup h2 {
        margin: 0 0 20px 0;
        color: #fff;
      }
      .join-popup input {
        width: 100%;
        padding: 12px;
        margin: 10px 0;
        border: 1px solid #444;
        border-radius: 5px;
        background: #2a2a2a;
        color: white;
        font-size: 16px;
        box-sizing: border-box;
      }
      .join-popup button {
        width: 100%;
        padding: 12px;
        margin: 10px 0;
        border: none;
        border-radius: 5px;
        background: #4CAF50;
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s;
      }
      .join-popup button:hover {
        background: #45a049;
      }
      .join-popup .hint {
        font-size: 12px;
        color: #aaa;
        margin: 10px 0 0 0;
      }
    `
    document.head.appendChild(style)
  }
}