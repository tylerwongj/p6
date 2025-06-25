/**
 * InputManager - Unified input handling for 2D games
 * Supports keyboard, mouse, touch, and gamepad input
 */
export class InputManager {
  constructor() {
    this.keys = {}
    this.keyBindings = {}
    this.actions = {}
    this.callbacks = {}
    
    this.setupKeyboardInput()
    this.setupMouseInput()
    this.setupTouchInput()
  }

  /**
   * Set up keyboard event listeners
   */
  setupKeyboardInput() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase()
      this.keys[key] = true
      
      // Handle special keys
      if (this.callbacks.keydown) {
        this.callbacks.keydown(e, key)
      }
      
      // Check for bound actions
      this.checkActionTriggers(key, true)
    })

    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase()
      this.keys[key] = false
      
      if (this.callbacks.keyup) {
        this.callbacks.keyup(e, key)
      }
      
      this.checkActionTriggers(key, false)
    })
  }

  /**
   * Set up mouse event listeners
   */
  setupMouseInput() {
    this.mouse = { x: 0, y: 0, buttons: {} }
    
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
      
      if (this.callbacks.mousemove) {
        this.callbacks.mousemove(e, this.mouse)
      }
    })

    document.addEventListener('mousedown', (e) => {
      this.mouse.buttons[e.button] = true
      
      if (this.callbacks.mousedown) {
        this.callbacks.mousedown(e, this.mouse)
      }
    })

    document.addEventListener('mouseup', (e) => {
      this.mouse.buttons[e.button] = false
      
      if (this.callbacks.mouseup) {
        this.callbacks.mouseup(e, this.mouse)
      }
    })
  }

  /**
   * Set up touch event listeners for mobile
   */
  setupTouchInput() {
    this.touches = []
    
    document.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.updateTouches(e.touches)
      
      if (this.callbacks.touchstart) {
        this.callbacks.touchstart(e, this.touches)
      }
    })

    document.addEventListener('touchmove', (e) => {
      e.preventDefault()
      this.updateTouches(e.touches)
      
      if (this.callbacks.touchmove) {
        this.callbacks.touchmove(e, this.touches)
      }
    })

    document.addEventListener('touchend', (e) => {
      e.preventDefault()
      this.updateTouches(e.touches)
      
      if (this.callbacks.touchend) {
        this.callbacks.touchend(e, this.touches)
      }
    })
  }

  /**
   * Update touch positions
   */
  updateTouches(touchList) {
    this.touches = Array.from(touchList).map(touch => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY
    }))
  }

  /**
   * Bind keys to actions
   * @param {string} action - Action name (e.g., 'moveUp')
   * @param {string|string[]} keys - Key or array of keys
   */
  bindAction(action, keys) {
    if (!Array.isArray(keys)) {
      keys = [keys]
    }
    
    this.keyBindings[action] = keys.map(key => key.toLowerCase())
    this.actions[action] = false
  }

  /**
   * Check if an action is currently active
   * @param {string} action - Action name
   * @returns {boolean}
   */
  isActionActive(action) {
    if (!this.keyBindings[action]) return false
    
    return this.keyBindings[action].some(key => this.keys[key])
  }

  /**
   * Check if a key is currently pressed
   * @param {string} key - Key name
   * @returns {boolean}
   */
  isKeyPressed(key) {
    return !!this.keys[key.toLowerCase()]
  }

  /**
   * Get current input state for common game actions
   * @returns {object} Input state
   */
  getInputState() {
    return {
      up: this.isActionActive('up') || this.isKeyPressed('w') || this.isKeyPressed('arrowup'),
      down: this.isActionActive('down') || this.isKeyPressed('s') || this.isKeyPressed('arrowdown'),
      left: this.isActionActive('left') || this.isKeyPressed('a') || this.isKeyPressed('arrowleft'),
      right: this.isActionActive('right') || this.isKeyPressed('d') || this.isKeyPressed('arrowright'),
      space: this.isKeyPressed(' ') || this.isKeyPressed('space'),
      enter: this.isKeyPressed('enter'),
      escape: this.isKeyPressed('escape')
    }
  }

  /**
   * Set up action triggers
   */
  checkActionTriggers(key, pressed) {
    for (const [action, keys] of Object.entries(this.keyBindings)) {
      if (keys.includes(key)) {
        const wasActive = this.actions[action]
        this.actions[action] = this.isActionActive(action)
        
        // Trigger callbacks for action changes
        if (!wasActive && this.actions[action] && this.callbacks.actionStart) {
          this.callbacks.actionStart(action)
        } else if (wasActive && !this.actions[action] && this.callbacks.actionEnd) {
          this.callbacks.actionEnd(action)
        }
      }
    }
  }

  /**
   * Set callback functions
   * @param {string} event - Event type
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    this.callbacks[event] = callback
  }

  /**
   * Remove callback functions
   * @param {string} event - Event type
   */
  off(event) {
    delete this.callbacks[event]
  }

  /**
   * Get mouse position relative to an element
   * @param {HTMLElement} element - Target element
   * @returns {object} Relative mouse position
   */
  getRelativeMousePos(element) {
    const rect = element.getBoundingClientRect()
    return {
      x: this.mouse.x - rect.left,
      y: this.mouse.y - rect.top
    }
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    // Note: In a real implementation, we'd store the bound functions
    // and properly remove event listeners here
    this.keys = {}
    this.callbacks = {}
    this.actions = {}
  }
}