let audioCtx: AudioContext | null = null

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  gain.gain.setValueAtTime(vol, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playArpeggio(freqs: number[], gap = 0.08) {
  const ctx = getCtx()
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, ctx.currentTime + i * gap)
    gain.gain.setValueAtTime(0.12, ctx.currentTime + i * gap)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * gap + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime + i * gap)
    osc.stop(ctx.currentTime + i * gap + 0.3)
  })
}

// ============ Lo-fi BGM Engine ============
type BGMNote = { freq: number; time: number; duration: number; velocity: number }

const CHORDS = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 349.23], // G7
]

let bgmPlaying = false
let bgmBPM = 72
let bgmInterval: ReturnType<typeof setInterval> | null = null
let bgmBeat = 0
let bgmChordIdx = 0

function scheduleBGM() {
  const ctx = getCtx()
  const beatDur = 60 / bgmBPM
  const now = ctx.currentTime

  // Kick on beats 0 and 2
  if (bgmBeat % 4 === 0 || bgmBeat % 4 === 2) {
    const t = now + 0.02
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.setValueAtTime(120, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12)
    gain.gain.setValueAtTime(0.25, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.2)
  }

  // Hihat on off-beats (1, 3, 5, 7 of 8th)
  if (bgmBeat % 2 === 1) {
    const t = now + 0.02
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filt = ctx.createBiquadFilter()
    osc.type = 'square'
    osc.frequency.setValueAtTime(8000, t)
    filt.type = 'highpass'
    filt.frequency.setValueAtTime(5000, t)
    gain.gain.setValueAtTime(0.03 + Math.random() * 0.02, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    osc.connect(filt)
    filt.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.05)
  }

  // Chord pad every 2 beats (half note)
  if (bgmBeat % 2 === 0) {
    const t = now + 0.02
    const chord = CHORDS[bgmChordIdx % CHORDS.length]
    bgmChordIdx = (bgmChordIdx + 1) % CHORDS.length

    // Master filter for lo-fi warmth
    const masterFilt = ctx.createBiquadFilter()
    masterFilt.type = 'lowpass'
    masterFilt.frequency.setValueAtTime(2800, t)
    masterFilt.frequency.linearRampToValueAtTime(2200, t + beatDur * 1.5)

    chord.forEach((f) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, t)
      // Slight detune for warmth
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, t)

      gain.gain.setValueAtTime(0.04, t)
      gain.gain.linearRampToValueAtTime(0.06, t + 0.3)
      gain.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 1.8)

      osc.connect(gain)
      gain.connect(masterFilt)
      osc.start(t)
      osc.stop(t + beatDur * 2)
    })

    // Sub-bass on root
    const subOsc = ctx.createOscillator()
    const subGain = ctx.createGain()
    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(chord[0] * 0.5, t)
    subGain.gain.setValueAtTime(0.08, t)
    subGain.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 1.8)
    subOsc.connect(subGain)
    subGain.connect(masterFilt)
    subOsc.start(t)
    subOsc.stop(t + beatDur * 2)

    masterFilt.connect(ctx.destination)
  }

  bgmBeat++
}

export const Sound = {
  enabled: true,

  toggle() {
    this.enabled = !this.enabled
    return this.enabled
  },

  beep(freq = 880, dur = 0.15) {
    if (!this.enabled) return
    playTone(freq, dur, 'sine', 0.12)
  },

  countdown3() {
    if (!this.enabled) return
    playTone(523, 0.2, 'sine', 0.15)
  },
  countdown2() {
    if (!this.enabled) return
    playTone(659, 0.2, 'sine', 0.15)
  },
  countdown1() {
    if (!this.enabled) return
    playTone(784, 0.2, 'sine', 0.15)
  },
  go() {
    if (!this.enabled) return
    playTone(1047, 0.4, 'square', 0.18)
    setTimeout(() => playTone(1319, 0.35, 'square', 0.14), 100)
  },

  buzzerLock() {
    if (!this.enabled) return
    playTone(880, 0.05, 'square', 0.2)
    setTimeout(() => playTone(1100, 0.08, 'square', 0.18), 50)
  },

  success() {
    if (!this.enabled) return
    playArpeggio([523, 659, 784, 1047], 0.08)
  },

  fail() {
    if (!this.enabled) return
    playTone(400, 0.3, 'sawtooth', 0.12)
    setTimeout(() => playTone(300, 0.4, 'sawtooth', 0.1), 150)
  },

  timeUp() {
    if (!this.enabled) return
    playTone(600, 0.1, 'square', 0.15)
    setTimeout(() => playTone(500, 0.1, 'square', 0.15), 120)
    setTimeout(() => playTone(400, 0.3, 'square', 0.12), 240)
  },

  click() {
    if (!this.enabled) return
    playTone(1200, 0.03, 'sine', 0.08)
  },

  // BGM
  bgm: {
    get playing() {
      return bgmPlaying
    },
    get bpm() {
      return bgmBPM
    },
    set bpm(v: number) {
      bgmBPM = Math.max(50, Math.min(120, v))
      if (bgmPlaying) {
        this.stop()
        this.play()
      }
    },
    play() {
      if (bgmPlaying) return
      getCtx()
      bgmPlaying = true
      bgmBeat = 0
      const beatMs = (60 / bgmBPM) * 1000
      bgmInterval = setInterval(scheduleBGM, beatMs / 2)
    },
    stop() {
      bgmPlaying = false
      if (bgmInterval) {
        clearInterval(bgmInterval)
        bgmInterval = null
      }
    },
  },
}

// Auto-init on first user interaction
function initAudio() {
  getCtx()
}
if (typeof window !== 'undefined') {
  window.addEventListener('click', initAudio, { once: true })
  window.addEventListener('keydown', initAudio, { once: true })
}
