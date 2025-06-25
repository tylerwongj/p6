export class GameLoop {
  constructor() {
    this.running = false
    this.lastTime = 0
    this.frameId = null
    this.onUpdate = null
    this.onRender = null
  }

  start(onUpdate, onRender) {
    if (this.running) return
    
    this.onUpdate = onUpdate
    this.onRender = onRender
    this.running = true
    this.lastTime = performance.now()
    this.loop()
  }

  stop() {
    this.running = false
    if (this.frameId) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }
  }

  loop() {
    if (!this.running) return
    
    const currentTime = performance.now()
    const deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime
    
    if (this.onUpdate) {
      this.onUpdate(deltaTime)
    }
    
    if (this.onRender) {
      this.onRender(deltaTime)
    }
    
    this.frameId = requestAnimationFrame(() => this.loop())
  }
}