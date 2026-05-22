import { useEffect, useState, useRef, useCallback } from 'react'
import { Zap, RotateCcw, CheckCircle2, XCircle, Keyboard, Smartphone, Palette, Settings, Plus, Trash2 } from 'lucide-react'
import { Sound } from '../lib/sound'

const COLOR_PRESETS = [
  { hex: '#ef4444', name: '紅' },
  { hex: '#3b82f6', name: '藍' },
  { hex: '#22c55e', name: '綠' },
  { hex: '#eab308', name: '黃' },
  { hex: '#a855f7', name: '紫' },
  { hex: '#f97316', name: '橙' },
  { hex: '#ec4899', name: '粉' },
  { hex: '#06b6d4', name: '青' },
]

export type BuzzerSlot = {
  id: number
  name: string
  color: string
  keyLabel: string
  keyCode: string
}

function createDefaultSlots(count = 4): BuzzerSlot[] {
  const names = ['紅隊', '藍隊', '綠隊', '黃隊', '紫隊', '橙隊', '粉隊', '青隊']
  const labels = ['1', '2', '3', '4', '5', '6', '7', '8']
  const codes = ['1', '2', '3', '4', '5', '6', '7', '8']
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: names[i] ?? `隊伍 ${i + 1}`,
    color: COLOR_PRESETS[i]?.hex ?? '#ef4444',
    keyLabel: labels[i] ?? `${i + 1}`,
    keyCode: codes[i] ?? `${i + 1}`,
  }))
}

export type BuzzerResult = {
  slotId: number
  playerName: string
  correct: boolean
  timestamp: number
  reactionMs: number
}

type Props = {
  players: { id: string; name: string; score: number }[]
  onAward: (playerId: string, points: number) => void
  disabled?: boolean
  onBuzz?: (result: BuzzerResult) => void
}

export default function BuzzerPanel({ players, onAward, disabled, onBuzz }: Props) {
  const [slotCount, setSlotCount] = useState(4)
  const [slots, setSlots] = useState<BuzzerSlot[]>(() => createDefaultSlots(4))
  const [armed, setArmed] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [winner, setWinner] = useState<{ slotId: number; reactionMs: number } | null>(null)
  const [buzzLog, setBuzzLog] = useState<BuzzerResult[]>([])
  const [showLog, setShowLog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const armTimeRef = useRef<number>(0)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Rebuild slots when count changes, preserving existing names/colors where possible
  useEffect(() => {
    setSlots((prev) => {
      const next: BuzzerSlot[] = []
      const defaults = createDefaultSlots(slotCount)
      for (let i = 0; i < slotCount; i++) {
        const existing = prev.find((s) => s.id === i + 1)
        next.push(
          existing ?? defaults[i]
        )
      }
      return next
    })
  }, [slotCount])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!armed || winner || disabled || countdown > 0) return
      const match = slots.find((s) => s.keyCode === e.key)
      if (!match) return
      e.preventDefault()
      const reaction = Date.now() - armTimeRef.current
      Sound.buzzerLock()
      setWinner({ slotId: match.id, reactionMs: reaction })
    },
    [armed, winner, disabled, slots, countdown],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  function startCountdown() {
    if (countdown > 0 || winner) return
    setArmed(false)
    setWinner(null)
    setCountdown(3)
    Sound.countdown3()

    let n = 3
    if (countdownTimer.current) clearInterval(countdownTimer.current)
    countdownTimer.current = setInterval(() => {
      n -= 1
      if (n === 2) Sound.countdown2()
      if (n === 1) Sound.countdown1()
      setCountdown(n)
      if (n <= 0) {
        if (countdownTimer.current) clearInterval(countdownTimer.current)
        setCountdown(0)
        setArmed(true)
        Sound.go()
        armTimeRef.current = Date.now()
      }
    }, 800)
  }

  function resetBuzzer() {
    if (countdownTimer.current) clearInterval(countdownTimer.current)
    setCountdown(0)
    setArmed(false)
    setWinner(null)
  }

  function judge(correct: boolean) {
    if (!winner) return
    const slot = slots.find((s) => s.id === winner.slotId)
    if (!slot) return

    const matchedPlayer = players.find((p) => p.name === slot.name)

    const result: BuzzerResult = {
      slotId: winner.slotId,
      playerName: slot.name,
      correct,
      timestamp: Date.now(),
      reactionMs: winner.reactionMs,
    }

    setBuzzLog((prev) => [result, ...prev].slice(0, 50))
    onBuzz?.(result)

    if (correct) Sound.success()
    else Sound.fail()

    if (matchedPlayer) {
      onAward(matchedPlayer.id, correct ? 1 : 0)
    }

    setTimeout(() => {
      setArmed(false)
      setWinner(null)
    }, 1200)
  }

  function updateSlot(id: number, patch: Partial<BuzzerSlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const winnerSlot = winner ? slots.find((s) => s.id === winner.slotId) : null
  const cols = slotCount <= 2 ? 2 : slotCount <= 4 ? 2 : slotCount <= 6 ? 3 : 4

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-300" />
          <div className="text-sm font-semibold text-white">Kahoot 搶答器</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/50">
            <Keyboard className="mr-1 inline h-3 w-3" />
            按 {slots.map((s) => s.keyLabel).join('/')} 搶答
          </span>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/50 hover:bg-white/10 hover:text-white/80"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="mb-3 space-y-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/60">隊伍數量</span>
            <div className="flex gap-1">
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSlotCount(n)}
                  className={`h-7 w-7 rounded-lg text-xs font-semibold transition ${
                    slotCount === n
                      ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {slots.map((slot) => (
              <div key={slot.id} className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2">
                <div className="flex items-center gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => updateSlot(slot.id, { color: c.hex })}
                      className={`h-4 w-4 rounded-full border transition ${
                        slot.color === c.hex ? 'border-white/60 scale-110' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={slot.color}
                    onChange={(e) => updateSlot(slot.id, { color: e.target.value })}
                    className="h-4 w-4 cursor-pointer overflow-hidden rounded-full border-0 p-0"
                  />
                </div>
                {editingId === slot.id ? (
                  <input
                    autoFocus
                    defaultValue={slot.name}
                    onBlur={(e) => { updateSlot(slot.id, { name: e.target.value }); setEditingId(null) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { updateSlot(slot.id, { name: e.currentTarget.value }); setEditingId(null) }
                    }}
                    className="rounded bg-white/5 px-1 py-0.5 text-center text-xs text-white"
                  />
                ) : (
                  <div
                    className="cursor-pointer text-center text-xs font-semibold"
                    style={{ color: slot.color }}
                    onClick={() => setEditingId(slot.id)}
                  >
                    {slot.name}
                  </div>
                )}
                <div className="text-center text-[10px] text-white/30">按鍵 {slot.keyLabel}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mb-3 flex items-center justify-between">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
            countdown > 0
              ? 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30'
              : armed && !winner
                ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30'
                : winner
                  ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30'
                  : 'bg-white/5 text-white/50 ring-1 ring-white/10'
          }`}
        >
          <div
            className={`h-2 w-2 rounded-full ${
              countdown > 0
                ? 'animate-pulse bg-sky-400'
                : armed && !winner
                  ? 'animate-pulse bg-emerald-400'
                  : winner
                    ? 'bg-amber-400'
                    : 'bg-white/30'
            }`}
          />
          {countdown > 0 ? `預備倒數 ${countdown}...` : armed && !winner ? '搶答進行中！' : winner ? '已鎖定搶答者' : '等待開啟搶答'}
        </div>
        <button
          type="button"
          onClick={armed || countdown > 0 ? resetBuzzer : startCountdown}
          disabled={Boolean(winner)}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            armed || countdown > 0
              ? 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
          } disabled:opacity-40`}
        >
          {armed || countdown > 0 ? <RotateCcw className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
          {armed || countdown > 0 ? '重置' : '預備開始'}
        </button>
      </div>

      {/* Countdown overlay inside panel */}
      {countdown > 0 && (
        <div className="mb-3 rounded-xl border border-sky-400/20 bg-sky-500/10 p-4 text-center">
          <div className="text-4xl font-black text-sky-200 animate-pulse">{countdown}</div>
        </div>
      )}

      {/* Buzzer slots */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {slots.map((slot) => {
          const isWinner = winner?.slotId === slot.id
          const isLocked = winner && !isWinner
          return (
            <div
              key={slot.id}
              onClick={() => {
                if (!armed || winner || disabled || countdown > 0) return
                const reaction = Date.now() - armTimeRef.current
                Sound.buzzerLock()
                setWinner({ slotId: slot.id, reactionMs: reaction })
              }}
              className={`relative cursor-pointer rounded-xl border p-3 text-center transition-all duration-200 select-none ${
                isWinner
                  ? 'scale-105 ring-2'
                  : isLocked
                    ? 'opacity-30'
                    : armed
                      ? 'hover:scale-[1.02] active:scale-95'
                      : ''
              }`}
              style={{
                borderColor: isWinner || armed ? `${slot.color}66` : 'rgba(255,255,255,0.1)',
                backgroundColor: isWinner ? `${slot.color}1a` : armed ? `${slot.color}0d` : 'rgba(255,255,255,0.03)',
                boxShadow: isWinner ? `0 0 20px ${slot.color}40` : 'none',
              }}
            >
              <div className="mb-1 text-2xl font-black" style={{ color: slot.color }}>
                {slot.keyLabel}
              </div>
              <div className="text-xs font-semibold" style={{ color: slot.color }}>
                {slot.name}
              </div>
              {isWinner && (
                <div className="mt-1 text-[10px] font-mono text-white/70">
                  {winner.reactionMs}ms
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Winner judgement */}
      {winner && winnerSlot && (
        <div className="mt-3 flex items-center justify-between rounded-xl border p-3" style={{ borderColor: `${winnerSlot.color}44`, backgroundColor: `${winnerSlot.color}10` }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: winnerSlot.color }}>
              🏆 {winnerSlot.name} 搶到！
            </span>
            <span className="text-xs text-white/50">反應 {winner.reactionMs}ms</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => judge(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 active:scale-95"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> 正確 +1
            </button>
            <button
              type="button"
              onClick={() => judge(false)}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 active:scale-95"
            >
              <XCircle className="h-3.5 w-3.5" /> 錯誤
            </button>
          </div>
        </div>
      )}

      {/* Mobile join hint */}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-white/40">
        <Smartphone className="h-3.5 w-3.5 shrink-0" />
        <span>
          同一裝置可分配不同按鍵給不同玩家。多台裝置建議在同一 Wi-Fi 下使用。
        </span>
      </div>

      {/* Buzz log */}
      {buzzLog.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowLog(!showLog)}
            className="text-[11px] text-white/50 underline underline-offset-2 hover:text-white/80"
          >
            {showLog ? '隱藏' : '顯示'} 搶答紀錄 ({buzzLog.length})
          </button>
          {showLog && (
            <div className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
              {buzzLog.slice(0, 20).map((log, i) => {
                const slot = slots.find((s) => s.id === log.slotId)
                return (
                  <div key={i} className="flex items-center justify-between py-0.5 text-[11px]">
                    <span className="text-white/60">
                      <span style={{ color: slot?.color }}>{log.playerName}</span> ({log.reactionMs}ms)
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        log.correct
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : 'bg-rose-500/20 text-rose-200'
                      }`}
                    >
                      {log.correct ? '正確' : '錯誤'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
