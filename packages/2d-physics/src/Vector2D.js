/**
 * Vector2D - 2D vector math utilities
 */
export class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  /**
   * Add another vector to this vector
   */
  add(vector) {
    return new Vector2D(this.x + vector.x, this.y + vector.y)
  }

  /**
   * Subtract another vector from this vector
   */
  subtract(vector) {
    return new Vector2D(this.x - vector.x, this.y - vector.y)
  }

  /**
   * Multiply vector by scalar
   */
  multiply(scalar) {
    return new Vector2D(this.x * scalar, this.y * scalar)
  }

  /**
   * Get the magnitude (length) of the vector
   */
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  /**
   * Normalize the vector (make it unit length)
   */
  normalize() {
    const mag = this.magnitude()
    if (mag === 0) return new Vector2D(0, 0)
    return new Vector2D(this.x / mag, this.y / mag)
  }

  /**
   * Calculate dot product with another vector
   */
  dot(vector) {
    return this.x * vector.x + this.y * vector.y
  }

  /**
   * Calculate distance to another vector
   */
  distanceTo(vector) {
    return this.subtract(vector).magnitude()
  }

  /**
   * Create a copy of this vector
   */
  clone() {
    return new Vector2D(this.x, this.y)
  }

  /**
   * Set vector values
   */
  set(x, y) {
    this.x = x
    this.y = y
    return this
  }

  /**
   * Static method to create vector from angle and magnitude
   */
  static fromAngle(angle, magnitude = 1) {
    return new Vector2D(
      Math.cos(angle) * magnitude,
      Math.sin(angle) * magnitude
    )
  }
}