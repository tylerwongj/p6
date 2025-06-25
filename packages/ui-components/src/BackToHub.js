/**
 * BackToHub - Consistent back to hub button for all games
 */
export class BackToHub {
  static getButtonHTML() {
    return `
      <a href="/" class="back-button">← Back to Hub</a>
    `
  }
  
  static getButtonCSS() {
    return `
      .back-button {
        position: absolute;
        top: 20px;
        left: 20px;
        padding: 10px 15px;
        background: #333;
        color: #fff;
        text-decoration: none;
        border-radius: 5px;
        border: 1px solid #555;
        font-family: inherit;
        font-size: 14px;
        z-index: 1000;
        transition: background 0.2s ease;
      }
      
      .back-button:hover {
        background: #555;
        color: #fff;
      }
      
      .back-button:visited {
        color: #fff;
      }
    `
  }
}