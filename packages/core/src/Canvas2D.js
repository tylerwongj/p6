export class Canvas2D {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.width = canvas.width
    this.height = canvas.height
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  drawRect(x, y, width, height, color = '#fff') {
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, width, height)
  }

  drawCircle(x, y, radius, color = '#fff') {
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, Math.PI * 2)
    this.ctx.fill()
  }

  drawLine(x1, y1, x2, y2, color = '#fff', width = 1) {
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = width
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.stroke()
  }

  drawText(text, x, y, color = '#fff', font = '20px Arial') {
    this.ctx.fillStyle = color
    this.ctx.font = font
    this.ctx.fillText(text, x, y)
  }

  setSize(width, height) {
    this.canvas.width = width
    this.canvas.height = height
    this.width = width
    this.height = height
  }
}