// Sound effects utility for workout app
// Uses Web Audio API for low-latency playback

class SoundManager {
  private context: AudioContext | null = null
  private sounds: Map<string, AudioBuffer> = new Map()
  private enabled: boolean = true

  constructor() {
    if (typeof window !== 'undefined') {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  // Generate sound effects procedurally
  private generateTone(frequency: number, duration: number, type: OscillatorType = 'sine'): AudioBuffer {
    if (!this.context) throw new Error('AudioContext not available')
    
    const sampleRate = this.context.sampleRate
    const length = sampleRate * duration
    const buffer = this.context.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 8) // Decay envelope
      
      if (type === 'sine') {
        data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3
      } else if (type === 'square') {
        data[i] = (Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1) * envelope * 0.15
      } else if (type === 'triangle') {
        data[i] = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t)) * envelope * 0.3
      }
    }

    return buffer
  }

  // Generate multi-tone chord sound for more impact
  private generateChord(frequencies: number[], duration: number): AudioBuffer {
    if (!this.context) throw new Error('AudioContext not available')
    
    const sampleRate = this.context.sampleRate
    const length = sampleRate * duration
    const buffer = this.context.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 6)
      
      let sample = 0
      frequencies.forEach(freq => {
        sample += Math.sin(2 * Math.PI * freq * t) / frequencies.length
      })
      
      data[i] = sample * envelope * 0.3
    }

    return buffer
  }

  // Generate power-up sound effect
  private generatePowerUp(): AudioBuffer {
    if (!this.context) throw new Error('AudioContext not available')
    
    const sampleRate = this.context.sampleRate
    const duration = 0.4
    const length = sampleRate * duration
    const buffer = this.context.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const progress = t / duration
      const frequency = 200 + progress * 600 // Sweep from 200Hz to 800Hz
      const envelope = Math.sin(progress * Math.PI) // Bell curve envelope
      
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.25
    }

    return buffer
  }

  // Generate countdown beep
  private generateBeep(pitch: number): AudioBuffer {
    if (!this.context) throw new Error('AudioContext not available')
    
    const sampleRate = this.context.sampleRate
    const duration = 0.1
    const length = sampleRate * duration
    const buffer = this.context.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const envelope = 1 - (t / duration) // Linear fade out
      data[i] = Math.sin(2 * Math.PI * pitch * t) * envelope * 0.2
    }

    return buffer
  }

  // Initialize sound effects
  init() {
    if (!this.context) return

    // Existing sounds
    this.sounds.set('click', this.generateTone(800, 0.05, 'sine'))
    this.sounds.set('success', this.generateTone(600, 0.15, 'sine'))
    this.sounds.set('start', this.generateTone(440, 0.12, 'triangle'))
    this.sounds.set('complete', this.generateTone(880, 0.2, 'sine'))
    this.sounds.set('add', this.generateTone(520, 0.08, 'sine'))
    this.sounds.set('remove', this.generateTone(200, 0.1, 'square'))
    this.sounds.set('tick', this.generateTone(1200, 0.03, 'sine'))
    this.sounds.set('pause', this.generateTone(350, 0.08, 'triangle'))
    
    // NEW EXERCISE-SPECIFIC SOUNDS
    
    // Rep completed - energetic pop
    this.sounds.set('rep_complete', this.generateTone(700, 0.08, 'sine'))
    
    // Exercise completed - triumphant chord
    this.sounds.set('exercise_complete', this.generateChord([523, 659, 784], 0.3))
    
    // Milestone reached - celebration
    this.sounds.set('milestone', this.generateChord([440, 554, 659, 880], 0.4))
    
    // Power/energy boost sound
    this.sounds.set('power', this.generatePowerUp())
    
    // Rest timer countdown beeps (3-2-1)
    this.sounds.set('countdown_3', this.generateBeep(400))
    this.sounds.set('countdown_2', this.generateBeep(500))
    this.sounds.set('countdown_1', this.generateBeep(600))
    this.sounds.set('countdown_go', this.generateChord([700, 900], 0.15))
    
    // Set started - motivational
    this.sounds.set('set_start', this.generateTone(500, 0.1, 'triangle'))
    
    // Weight increase celebration
    this.sounds.set('weight_up', this.generateChord([600, 800], 0.2))
    
    // Personal record - epic achievement
    this.sounds.set('pr', this.generateChord([523, 659, 784, 1047], 0.5))
    
    // Timer running pulse (subtle heartbeat)
    this.sounds.set('pulse', this.generateTone(100, 0.05, 'sine'))
    
    // Workout halfway point
    this.sounds.set('halfway', this.generateChord([440, 587], 0.25))
  }

  play(soundName: string, volume: number = 0.5) {
    if (!this.enabled || !this.context) return
    
    const buffer = this.sounds.get(soundName)
    if (!buffer) return

    try {
      const source = this.context.createBufferSource()
      const gainNode = this.context.createGain()
      
      source.buffer = buffer
      gainNode.gain.value = volume
      
      source.connect(gainNode)
      gainNode.connect(this.context.destination)
      
      source.start(0)
    } catch (error) {
      console.warn('Error playing sound:', error)
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  isEnabled() {
    return this.enabled
  }
}

// Singleton instance
const soundManager = new SoundManager()

// Initialize asynchronously on user interaction without blocking the main thread
if (typeof window !== 'undefined') {
  let initialized = false
  const initOnInteraction = () => {
    if (!initialized) {
      initialized = true
      setTimeout(() => {
        try {
          soundManager.init()
        } catch (e) {
          console.warn('SoundManager init error:', e)
        }
      }, 100)
      document.removeEventListener('click', initOnInteraction)
      document.removeEventListener('touchstart', initOnInteraction)
    }
  }
  document.addEventListener('click', initOnInteraction, { once: true, passive: true })
  document.addEventListener('touchstart', initOnInteraction, { once: true, passive: true })
}

export default soundManager