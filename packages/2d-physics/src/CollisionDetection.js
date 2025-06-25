/**
 * CollisionDetection - 2D collision detection utilities
 */
export class CollisionDetection {
  
  /**
   * Check collision between a circle and a rectangle
   * @param {object} circle - {x, y, radius}
   * @param {object} rect - {x, y, width, height}
   * @returns {boolean}
   */
  static circleRectCollision(circle, rect) {
    // Find the closest point on the rectangle to the circle center
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width))
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height))
    
    // Calculate distance from circle center to closest point
    const distanceX = circle.x - closestX
    const distanceY = circle.y - closestY
    const distanceSquared = distanceX * distanceX + distanceY * distanceY
    
    return distanceSquared <= circle.radius * circle.radius
  }

  /**
   * Check collision between two circles
   * @param {object} circle1 - {x, y, radius}
   * @param {object} circle2 - {x, y, radius}
   * @returns {boolean}
   */
  static circleCircleCollision(circle1, circle2) {
    const dx = circle1.x - circle2.x
    const dy = circle1.y - circle2.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= circle1.radius + circle2.radius
  }

  /**
   * Check collision between two rectangles
   * @param {object} rect1 - {x, y, width, height}
   * @param {object} rect2 - {x, y, width, height}
   * @returns {boolean}
   */
  static rectRectCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y
  }

  /**
   * Check if a point is inside a rectangle
   * @param {object} point - {x, y}
   * @param {object} rect - {x, y, width, height}
   * @returns {boolean}
   */
  static pointInRect(point, rect) {
    return point.x >= rect.x &&
           point.x <= rect.x + rect.width &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.height
  }

  /**
   * Check if a point is inside a circle
   * @param {object} point - {x, y}
   * @param {object} circle - {x, y, radius}
   * @returns {boolean}
   */
  static pointInCircle(point, circle) {
    const dx = point.x - circle.x
    const dy = point.y - circle.y
    return dx * dx + dy * dy <= circle.radius * circle.radius
  }
}