/**
 * GameControls - Consistent control hints and restart functionality
 */
export class GameControls {
  static getRestartHTML(key = '0') {
    return `
      <div class="game-controls">
        Press <strong>${key}</strong> to restart game
      </div>
    `
  }
  
  static getControlsCSS() {
    return `
      .game-controls {
        font-size: 0.8em;
        color: #aaa;
        margin: 10px 0;
        text-align: center;
      }
      
      .game-controls strong {
        color: #fff;
        background: #333;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
      }
    `
  }
  
  /**
   * Set up restart key listener
   * @param {string} key - Key to listen for (default: '0')
   * @param {function} callback - Function to call when key is pressed
   */
  static setupRestartKey(key = '0', callback) {
    document.addEventListener('keydown', (e) => {
      if (e.key === key) {
        e.preventDefault()
        callback()
      }
    })
  }
}