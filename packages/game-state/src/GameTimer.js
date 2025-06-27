export class GameTimer {
  constructor(durationMs = null) {
    this.startTime = null
    this.endTime = null
    this.duration = durationMs
    this.pausedTime = 0
    this.isPaused = false
    this.onTimeUp = null
    this.onTick = null
    this.tickInterval = null
  }

  start() {
    if (this.startTime) return
    
    this.startTime = Date.now()
    if (this.duration) {
      this.endTime = this.startTime + this.duration
    }
    
    if (this.onTick) {
      this.tickInterval = setInterval(() => {
        this.onTick(this.getTimeRemaining(), this.getElapsed())
        
        if (this.isTimeUp() && this.onTimeUp) {
          this.onTimeUp()
          this.stop()
        }
      }, 1000)
    }
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
  }

  pause() {
    if (this.isPaused || !this.startTime) return
    
    this.isPaused = true
    this.pausedTime = Date.now()
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
  }

  resume() {
    if (!this.isPaused || !this.startTime) return
    
    const pauseDuration = Date.now() - this.pausedTime
    this.startTime += pauseDuration
    if (this.endTime) {
      this.endTime += pauseDuration
    }
    
    this.isPaused = false
    this.pausedTime = 0
    
    if (this.onTick) {
      this.tickInterval = setInterval(() => {
        this.onTick(this.getTimeRemaining(), this.getElapsed())
        
        if (this.isTimeUp() && this.onTimeUp) {
          this.onTimeUp()
          this.stop()
        }
      }, 1000)
    }
  }

  getElapsed() {
    if (!this.startTime) return 0
    
    const currentTime = this.isPaused ? this.pausedTime : Date.now()
    return currentTime - this.startTime
  }

  getTimeRemaining() {
    if (!this.duration || !this.startTime) return null
    
    const elapsed = this.getElapsed()
    return Math.max(0, this.duration - elapsed)
  }

  isTimeUp() {
    const remaining = this.getTimeRemaining()
    return remaining !== null && remaining === 0
  }

  setDuration(durationMs) {
    this.duration = durationMs
    if (this.startTime) {
      this.endTime = this.startTime + durationMs
    }
  }

  setTimeUpCallback(callback) {
    this.onTimeUp = callback
  }

  setTickCallback(callback) {
    this.onTick = callback
  }

  reset() {
    this.stop()
    this.startTime = null
    this.endTime = null
    this.pausedTime = 0
    this.isPaused = false
  }

  getState() {
    return {
      elapsed: this.getElapsed(),
      remaining: this.getTimeRemaining(),
      isRunning: !!this.startTime && !this.isPaused,
      isPaused: this.isPaused,
      isTimeUp: this.isTimeUp()
    }
  }
}