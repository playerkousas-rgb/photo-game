import { useEffect, useState, useRef } from 'react'
import { Timer, RotateCcw, Play, Pause, Trophy, Volume2, VolumeX } from 'lucide-react'
import { Sound } from '../lib/sound'

export type RoundRecord = {
  round: number
  seconds: number
  timestamp: number
}

type Props = {
  running: boolean
  setRunning?: (v: boolean) => void
  resetSignal?: number
  onTimeUp?: () => void
  initialSeconds?: number
  currentRound?: number
  onRoundComplete?: (record: RoundRecord) => void
}

export default function GameTimer({
  running,
  setRunning,
  resetSignal,
  onTimeUp,
  initialSeconds = 60,
  currentRound = 1,
  onRoundComplete,
}: Props) {
  const [mode, setMode] = useState<'countdown' | 'stopwatch'>('stopwatch')
  const [soundOn, setSoundOn] = useState(true)

  // Countdown state
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const [duration, setDuration] = useState(initialSeconds)

  // Stopwatch state
  const [elapsed, setElapsed] = useState(0)
  const swIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const swStartRef = useRef<number>(0)
  const swOffsetRef = useRef<number>(0)

  // Round history (stopwatch only)
  const [records, setRecords] = useState<RoundRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    Sound.enabled = soundOn
  }, [soundOn])

  useEffect(() => {
    if (mode === 'countdown') {
      setTimeLeft(duration)
    } else {
      setElapsed(0)
      swOffsetRef.current = 0
    }
  }, [resetSignal, duration, mode])

  // Countdown timer
  useEffect(() => {
    if (mode !== 'countdown' || !running) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          Sound.timeUp()
          onTimeUp?.()
          setRunning?.(false)
          return 0
        }
        if (t <= 4) Sound.beep(800 + (5 - t) * 200, 0.12)
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running, mode, onTimeUp, setRunning])

  // Stopwatch timer
  useEffect(() => {
    if (mode !== 'stopwatch') return
    if (running) {
      swStartRef.current = Date.now() - swOffsetRef.current
      swIntervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - swStartRef.current) / 1000))
      }, 100)
    } else {
      if (swIntervalRef.current) clearInterval(swIntervalRef.current)
      swOffsetRef.current = Date.now() - swStartRef.current
    }
    return () => {
      if (swIntervalRef.current) clearInterval(swIntervalRef.current)
    }
  }, [running, mode])

  function handleCompleteRound() {
    if (mode !== 'stopwatch') return
    const secs = elapsed
    const record: RoundRecord = { round: currentRound, seconds: secs, timestamp: Date.now() }
    setRecords((prev) => [record, ...prev].slice(0, 20))
    onRoundComplete?.(record)
    Sound.success()
    setElapsed(0)
    swOffsetRef.current = 0
    swStartRef.current = Date.now()
  }

  function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Countdown render
  if (mode === 'countdown') {
    const pct = duration > 0 ? (timeLeft / duration) * 100 : 0
    const color = pct > 50 ? 'bg-emerald-400' : pct > 25 ? 'bg-amber-400' : 'bg-rose-400'
    const labelColor = pct > 50 ? 'text-emerald-300' : pct > 25 ? 'text-amber-300' : 'text-rose-300'

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-amber-300" />
            <div className="text-sm font-semibold text-white">限時倒數</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundOn((s) => !s)}
              className="rounded-lg bg-white/5 p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              title={soundOn ? '音效開啟' : '音效關閉'}
            >
              {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setMode('stopwatch')}
              className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/50 hover:bg-white/10 hover:text-white/80"
            >
              切秒表
            </button>
            <select
              value={duration}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                setDuration(v)
                setTimeLeft(v)
              }}
              disabled={running}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              {[15, 30, 45, 60, 90, 120, 180].map((s) => (
                <option key={s} value={s} style={{ background: '#02133e', color: '#fff' }}>
                  {s} 秒
                </option>
              ))}
            </select>
            <span className={`font-mono text-lg font-bold ${labelColor}`}>{formatTime(timeLeft)}</span>
          </div>
        </div>
        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className={`h-full transition-all duration-1000 ease-linear ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-white/50">
          <span>時間到自動提示</span>
          <button
            type="button"
            onClick={() => setTimeLeft(duration)}
            disabled={running}
            className="inline-flex items-center gap-1 text-white/60 hover:text-white disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" /> 重設
          </button>
        </div>
      </div>
    )
  }

  // Stopwatch render
  const isRunning = running && mode === 'stopwatch'
  const totalRecords = records.length
  const avgTime = totalRecords > 0 ? records.reduce((s, r) => s + r.seconds, 0) / totalRecords : 0
  const bestTime = totalRecords > 0 ? Math.min(...records.map((r) => r.seconds)) : null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-sky-300" />
          <div className="text-sm font-semibold text-white">秒表計時</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundOn((s) => !s)}
            className="rounded-lg bg-white/5 p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
            title={soundOn ? '音效開啟' : '音效關閉'}
          >
            {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setMode('countdown')}
            className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/50 hover:bg-white/10 hover:text-white/80"
          >
            切限時
          </button>
          <span className="font-mono text-lg font-bold text-sky-300">{formatTime(elapsed)}</span>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!isRunning) Sound.click()
            setRunning?.(!isRunning)
          }}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            isRunning
              ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
          }`}
        >
          {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isRunning ? '暫停' : '開始'}
        </button>
        <button
          type="button"
          onClick={() => {
            Sound.click()
            setElapsed(0)
            swOffsetRef.current = 0
            setRunning?.(false)
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 歸零
        </button>
        <button
          type="button"
          onClick={handleCompleteRound}
          disabled={elapsed === 0}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/30 disabled:opacity-40 active:scale-95"
        >
          <Trophy className="h-3.5 w-3.5" /> 完成此輪
        </button>
      </div>

      {totalRecords > 0 && (
        <div className="mb-2 flex items-center gap-3 text-[11px] text-white/60">
          <span>
            已完成 <b className="text-white">{totalRecords}</b> 輪
          </span>
          <span>
            平均 <b className="text-white">{avgTime.toFixed(1)}s</b>
          </span>
          {bestTime !== null && (
            <span>
              最快 <b className="text-emerald-300">{bestTime}s</b>
            </span>
          )}
        </div>
      )}

      {records.length > 0 && (
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="mb-1 text-[11px] text-white/50 underline underline-offset-2 hover:text-white/80"
        >
          {showHistory ? '隱藏歷史' : `查看歷史 (${records.length})`}
        </button>
      )}

      {showHistory && records.length > 0 && (
        <div className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
          <div className="grid grid-cols-3 gap-1 text-[11px] text-white/50">
            <span className="px-1">輪次</span>
            <span className="px-1">用時</span>
            <span className="px-1">時間</span>
          </div>
          {records.map((r, i) => (
            <div
              key={r.timestamp}
              className={`grid grid-cols-3 gap-1 rounded px-1 py-0.5 text-[11px] ${
                i === 0 ? 'bg-indigo-500/10 text-indigo-200' : 'text-white/70'
              }`}
            >
              <span>第 {r.round} 輪</span>
              <span className="font-mono">{r.seconds}s</span>
              <span>{new Date(r.timestamp).toLocaleTimeString('zh-Hant', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-1 text-[11px] text-white/40">
        按「開始」計時 → 公布答案後按「完成此輪」記錄用時。最後 3 秒限時模式會有音效提示。
      </div>
    </div>
  )
}
