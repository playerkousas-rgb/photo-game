import { useState } from 'react'
import { Trophy, UserPlus, UserMinus, Crown, RotateCcw, Medal, BarChart3, Clock, Target } from 'lucide-react'

export type Player = {
  id: string
  name: string
  score: number
  correctCount?: number
  wrongCount?: number
  totalBuzzes?: number
  totalTimeMs?: number
  roundTimes?: number[]
}

type Props = {
  players: Player[]
  setPlayers: (players: Player[]) => void
  showStats?: boolean
}

export default function ScoreBoard({ players, setPlayers, showStats = true }: Props) {
  const [newName, setNewName] = useState('')

  function addPlayer() {
    if (!newName.trim()) return
    setPlayers([
      ...players,
      {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        name: newName.trim(),
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        totalBuzzes: 0,
        totalTimeMs: 0,
        roundTimes: [],
      },
    ])
    setNewName('')
  }

  function removePlayer(id: string) {
    setPlayers(players.filter((p) => p.id !== id))
  }

  function award(id: string, delta = 1) {
    setPlayers(
      players.map((p) =>
        p.id === id
          ? {
              ...p,
              score: p.score + delta,
              correctCount: (p.correctCount ?? 0) + (delta > 0 ? 1 : 0),
            }
          : p,
      ),
    )
  }

  function penalty(id: string) {
    setPlayers(
      players.map((p) =>
        p.id === id
          ? { ...p, score: Math.max(0, p.score - 1), wrongCount: (p.wrongCount ?? 0) + 1 }
          : p,
      ),
    )
  }

  function resetScores() {
    setPlayers(
      players.map((p) => ({
        ...p,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        totalBuzzes: 0,
        totalTimeMs: 0,
        roundTimes: [],
      })),
    )
  }

  function recordTime(id: string, seconds: number) {
    setPlayers(
      players.map((p) =>
        p.id === id
          ? {
              ...p,
              totalTimeMs: (p.totalTimeMs ?? 0) + seconds * 1000,
              roundTimes: [...(p.roundTimes ?? []), seconds].slice(0, 50),
            }
          : p,
      ),
    )
  }

  const sorted = [...players].sort((a, b) => b.score - a.score)
  const leader = sorted[0] ?? null

  // Stats helpers
  const avgTime = (p: Player) => {
    const times = p.roundTimes ?? []
    if (!times.length) return null
    return (times.reduce((s, t) => s + t, 0) / times.length).toFixed(1)
  }
  const accuracy = (p: Player) => {
    const c = p.correctCount ?? 0
    const w = p.wrongCount ?? 0
    const total = c + w
    if (!total) return null
    return Math.round((c / total) * 100)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-300" />
          <div className="text-sm font-semibold text-white">多人計分板</div>
        </div>
        {players.length > 0 && (
          <button
            type="button"
            onClick={resetScores}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/50 hover:bg-white/10 hover:text-white/80"
          >
            <RotateCcw className="h-3 w-3" /> 重置
          </button>
        )}
      </div>

      {players.length === 0 ? (
        <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
          加入成員開始團體猜謎競賽！主持人公布答案後可幫答對者加分，也可使用 Kahoot 搶答器。
        </div>
      ) : (
        <div className="mb-3 grid gap-2">
          {sorted.map((p, idx) => {
            const acc = accuracy(p)
            const avg = avgTime(p)
            return (
              <div
                key={p.id}
                className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/[0.07]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {idx === 0 && leader && leader.score > 0 ? (
                      <Crown className="h-4 w-4 text-amber-300" />
                    ) : idx === 1 ? (
                      <Medal className="h-4 w-4 text-slate-300" />
                    ) : idx === 2 ? (
                      <Medal className="h-4 w-4 text-amber-600" />
                    ) : (
                      <span className="w-4 text-center text-xs font-mono text-white/40">
                        #{idx + 1}
                      </span>
                    )}
                    <span className="text-sm font-medium text-white">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="min-w-[1.5rem] text-center font-mono text-sm font-bold text-amber-300">
                      {p.score}
                    </span>
                    <button
                      type="button"
                      onClick={() => award(p.id, 1)}
                      className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/30 active:scale-95"
                      title="答對 +1"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => penalty(p.id)}
                      className="rounded-lg bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30 active:scale-95"
                      title="答錯 -1"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => removePlayer(p.id)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-white/60 hover:bg-white/10"
                      title="移除"
                    >
                      <UserMinus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {showStats && (acc !== null || avg !== null || (p.totalTimeMs ?? 0) > 0) && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                    {acc !== null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5">
                        <Target className="h-3 w-3 text-sky-300" />
                        正確率 {acc}%
                      </span>
                    )}
                    {avg !== null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5">
                        <Clock className="h-3 w-3 text-amber-300" />
                        平均 {avg}s
                      </span>
                    )}
                    {(p.roundTimes?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5">
                        <BarChart3 className="h-3 w-3 text-emerald-300" />
                        {p.roundTimes?.length} 輪
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          placeholder="輸入成員名稱（例如：紅隊、小明）..."
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
        />
        <button
          type="button"
          onClick={addPlayer}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-400 active:scale-95"
        >
          <UserPlus className="h-4 w-4" /> 加入
        </button>
      </div>
    </div>
  )
}
