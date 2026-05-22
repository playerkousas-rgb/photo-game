import { useEffect, useState } from 'react'
import { Music, Pause, Play, Volume2, VolumeX, Gauge } from 'lucide-react'
import { Sound } from '../lib/sound'

export default function BGMPlayer() {
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpm] = useState(72)
  const [soundOn, setSoundOn] = useState(Sound.enabled)

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaying(Sound.bgm.playing)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  function toggle() {
    if (Sound.bgm.playing) {
      Sound.bgm.stop()
      setPlaying(false)
    } else {
      Sound.enabled = true
      setSoundOn(true)
      Sound.bgm.play()
      setPlaying(true)
    }
  }

  function handleBPM(v: number) {
    setBpm(v)
    Sound.bgm.bpm = v
  }

  function toggleSound() {
    const on = Sound.toggle()
    setSoundOn(on)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-indigo-300" />
          <div className="text-sm font-semibold text-white">背景音樂</div>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          className="rounded-lg bg-white/5 p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          title={soundOn ? '音效開啟' : '音效關閉'}
        >
          {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition active:scale-95 ${
            playing
              ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
              : 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-400'
          }`}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? '暫停音樂' : '播放 lo-fi'}
        </button>

        <div className="flex flex-1 items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-white/40" />
          <input
            type="range"
            min={50}
            max={100}
            step={1}
            value={bpm}
            onChange={(e) => handleBPM(parseInt(e.target.value))}
            className="h-1 flex-1 appearance-none rounded-full bg-white/10 accent-indigo-400"
          />
          <span className="min-w-[2.5rem] text-right font-mono text-xs text-white/60">
            {bpm} BPM
          </span>
        </div>
      </div>

      <div className="mt-2 text-[11px] text-white/40">
        輕鬆 lo-fi 和弦伴奏，可調整速度。播放期間不影響其他音效。
      </div>
    </div>
  )
}
