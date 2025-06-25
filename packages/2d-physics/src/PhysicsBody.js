import { Vector2D } from './Vector2D.js'

/**
 * PhysicsBody - A physics body with position, velocity, and bounds
 */
export class PhysicsBody {
  constructor(x = 0, y = 0) {
    this.position = new Vector2D(x, y)
    this.velocity = new Vector2D(0, 0)
    this.bounds = null // {minX, maxX, minY, maxY}
  }

  /**
   * Update position based on velocity and delta time
   * @param {number} deltaTime - Time elapsed in seconds
   */
  update(deltaTime) {
    this.position.x += this.velocity.x * deltaTime
    this.position.y += this.velocity.y * deltaTime
    
    // Apply bounds if set
    if (this.bounds) {
      this.applyBounds()
    }
  }

  /**
   * Set bounds for this physics body
   * @param {object} bounds - {minX, maxX, minY, maxY}
   */
  setBounds(bounds) {
    this.bounds = bounds
  }

  /**
   * Apply bounds constraints
   */
  applyBounds() {
    if (!this.bounds) return
    
    if (this.position.x < this.bounds.minX) {
      this.position.x = this.bounds.minX
    } else if (this.position.x > this.bounds.maxX) {
      this.position.x = this.bounds.maxX
    }
    
    if (this.position.y < this.bounds.minY) {
      this.position.y = this.bounds.minY
    } else if (this.position.y > this.bounds.maxY) {
      this.position.y = this.bounds.maxY
    }
  }

  /**
   * Set position
   * @param {number} x
   * @param {number} y
   */
  setPosition(x, y) {
    this.position.set(x, y)
  }

  /**
   * Set velocity
   * @param {number} x
   * @param {number} y
   */
  setVelocity(x, y) {
    this.velocity.set(x, y)
  }

  /**
   * Add velocity
   * @param {number} x
   * @param {number} y
   */
  addVelocity(x, y) {
    this.velocity.x += x
    this.velocity.y += y
  }
}