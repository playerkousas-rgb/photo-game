import { useMemo, useRef } from 'react'
import { Trophy, Crown, Medal, X, Clock, Target, Hash, Download, Sparkles, ImageIcon } from 'lucide-react'
import type { Player } from './ScoreBoard'

type Props = {
  open: boolean
  players: Player[]
  onClose: () => void
}

export default function Leaderboard({ open, players, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        const aAcc = (a.correctCount ?? 0) + (a.wrongCount ?? 0)
          ? (a.correctCount ?? 0) / ((a.correctCount ?? 0) + (a.wrongCount ?? 0))
          : 0
        const bAcc = (b.correctCount ?? 0) + (b.wrongCount ?? 0)
          ? (b.correctCount ?? 0) / ((b.correctCount ?? 0) + (b.wrongCount ?? 0))
          : 0
        if (bAcc !== aAcc) return bAcc - aAcc
        const aAvg = a.roundTimes?.length
          ? a.roundTimes.reduce((s, t) => s + t, 0) / a.roundTimes.length
          : Infinity
        const bAvg = b.roundTimes?.length
          ? b.roundTimes.reduce((s, t) => s + t, 0) / b.roundTimes.length
          : Infinity
        return aAvg - bAvg
      }),
    [players],
  )

  function exportText() {
    const lines = [
      '🏆 SKWSCOUT 猜謎大賽排行榜',
      `生成時間: ${new Date().toLocaleString('zh-Hant')}`,
      '',
      ...sorted.map((p, i) => {
        const acc = (p.correctCount ?? 0) + (p.wrongCount ?? 0)
          ? Math.round(((p.correctCount ?? 0) / ((p.correctCount ?? 0) + (p.wrongCount ?? 0))) * 100)
          : '-'
        const avg = p.roundTimes?.length
          ? (p.roundTimes.reduce((s, t) => s + t, 0) / p.roundTimes.length).toFixed(1)
          : '-'
        return `${i + 1}. ${p.name} — ${p.score} 分 | 正確率 ${acc}% | 平均 ${avg}s | ${p.roundTimes?.length ?? 0} 輪`
      }),
    ]
    navigator.clipboard?.writeText(lines.join('\n')).then(() => alert('排行榜已複製到剪貼簿！'))
  }

  function exportImage() {
    const canvas = document.createElement('canvas')
    canvasRef.current = canvas
    const W = 800
    const rowH = 48
    const headerH = 200
    const footerH = 60
    const totalH = headerH + Math.max(sorted.length, 1) * rowH + footerH
    canvas.width = W
    canvas.height = totalH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#02133e'
    ctx.fillRect(0, 0, W, totalH)

    // Decorative glow
    const glow = ctx.createRadialGradient(W / 2, 80, 10, W / 2, 80, 300)
    glow.addColorStop(0, 'rgba(99,102,241,0.25)')
    glow.addColorStop(1, 'rgba(2,19,62,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, headerH)

    // Header
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 36px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🏆 猜謎大賽排行榜', W / 2, 60)

    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '16px sans-serif'
    ctx.fillText('SKWSCOUT · ' + new Date().toLocaleDateString('zh-Hant'), W / 2, 90)

    // Top 3 highlight
    if (sorted.length >= 1) {
      ctx.fillStyle = 'rgba(251,191,36,0.12)'
      ctx.fillRect(0, headerH, W, rowH)
    }
    if (sorted.length >= 2) {
      ctx.fillStyle = 'rgba(148,163,184,0.08)'
      ctx.fillRect(0, headerH + rowH, W, rowH)
    }
    if (sorted.length >= 3) {
      ctx.fillStyle = 'rgba(217,119,6,0.08)'
      ctx.fillRect(0, headerH + rowH * 2, W, rowH)
    }

    // Rows
    sorted.forEach((p, i) => {
      const y = headerH + i * rowH
      const acc = (p.correctCount ?? 0) + (p.wrongCount ?? 0)
        ? Math.round(((p.correctCount ?? 0) / ((p.correctCount ?? 0) + (p.wrongCount ?? 0))) * 100)
        : null
      const avg = p.roundTimes?.length
        ? (p.roundTimes.reduce((s, t) => s + t, 0) / p.roundTimes.length).toFixed(1)
        : null

      // Rank
      ctx.textAlign = 'center'
      ctx.font = 'bold 18px sans-serif'
      ctx.fillStyle =
        i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : 'rgba(255,255,255,0.5)'
      ctx.fillText(i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`, 40, y + 32)

      // Name
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = 'bold 18px sans-serif'
      ctx.fillText(p.name, 80, y + 28)

      // Score
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText(`${p.score}`, W - 40, y + 30)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '12px sans-serif'
      ctx.fillText('分', W - 12, y + 30)

      // Stats under name
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.font = '12px sans-serif'
      const stats = [
        acc !== null ? `正確率 ${acc}%` : '',
        avg !== null ? `平均 ${avg}s` : '',
        `${p.roundTimes?.length ?? 0} 輪`,
      ]
        .filter(Boolean)
        .join(' · ')
      ctx.fillText(stats, 80, y + 42)
    })

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(0, totalH - footerH, W, 1)
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '14px sans-serif'
    ctx.fillText('COPYRIGHT 2026 SKWSCOUT · photo-game.vercel.app', W / 2, totalH - 25)

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `skwscout-leaderboard-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#02133e] shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-white/10 p-6 text-center">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-30">
            <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/30 blur-3xl" />
          </div>
          <div className="mb-1 flex items-center justify-center gap-2 text-amber-300">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-wider uppercase">SKWSCOUT</span>
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-white">🏆 排行榜</h2>
          <p className="mt-1 text-xs text-white/50">猜謎大賽最終成績</p>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
          >
            <X className="h-4 w-4" /> 關閉
          </button>
        </div>

        {/* Top 3 Podium */}
        {sorted.length >= 2 && (
          <div className="flex items-end justify-center gap-2 px-6 pb-4 pt-6">
            {sorted[1] && (
              <div className="flex w-24 flex-col items-center">
                <div className="mb-2 grid h-12 w-12 place-items-center rounded-full border-2 border-slate-300/30 bg-slate-500/15 text-lg font-black text-slate-300">
                  🥈
                </div>
                <div className="w-full rounded-t-xl border border-white/10 bg-white/5 p-2 pb-3 text-center">
                  <div className="truncate text-xs font-semibold text-white">{sorted[1].name}</div>
                  <div className="font-mono text-lg font-bold text-slate-300">{sorted[1].score}</div>
                </div>
              </div>
            )}
            {sorted[0] && (
              <div className="flex w-28 flex-col items-center">
                <div className="mb-2 grid h-16 w-16 place-items-center rounded-full border-2 border-amber-300/40 bg-amber-500/15 text-2xl font-black text-amber-300 shadow-lg shadow-amber-500/20">
                  🥇
                </div>
                <div className="w-full rounded-t-xl border border-amber-400/20 bg-amber-500/10 p-2 pb-4 text-center">
                  <div className="truncate text-sm font-bold text-amber-200">{sorted[0].name}</div>
                  <div className="font-mono text-xl font-black text-amber-300">{sorted[0].score}</div>
                </div>
              </div>
            )}
            {sorted[2] && (
              <div className="flex w-24 flex-col items-center">
                <div className="mb-2 grid h-12 w-12 place-items-center rounded-full border-2 border-amber-600/30 bg-amber-700/15 text-lg font-black text-amber-600">
                  🥉
                </div>
                <div className="w-full rounded-t-xl border border-white/10 bg-white/5 p-2 pb-3 text-center">
                  <div className="truncate text-xs font-semibold text-white">{sorted[2].name}</div>
                  <div className="font-mono text-lg font-bold text-amber-600">{sorted[2].score}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full list */}
        <div className="max-h-[50vh] overflow-y-auto px-6 py-2">
          <div className="mb-2 grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 border-b border-white/10 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            <span className="w-8 text-center">#</span>
            <span>名稱</span>
            <span className="text-center">分數</span>
            <span className="text-center">正確率</span>
            <span className="text-center">平均</span>
          </div>

          {sorted.length === 0 ? (
            <div className="py-6 text-center text-xs text-white/40">尚無玩家資料</div>
          ) : (
            sorted.map((p, i) => {
              const totalAttempts = (p.correctCount ?? 0) + (p.wrongCount ?? 0)
              const acc = totalAttempts
                ? Math.round(((p.correctCount ?? 0) / totalAttempts) * 100)
                : null
              const avg = p.roundTimes?.length
                ? (p.roundTimes.reduce((s, t) => s + t, 0) / p.roundTimes.length).toFixed(1)
                : null

              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-xl px-2 py-2 ${
                    i === 0
                      ? 'bg-amber-500/5'
                      : i === 1
                        ? 'bg-white/[0.02]'
                        : i === 2
                          ? 'bg-white/[0.02]'
                          : ''
                  }`}
                >
                  <div className="flex w-8 justify-center">
                    {i === 0 ? (
                      <Crown className="h-4 w-4 text-amber-300" />
                    ) : i === 1 ? (
                      <Medal className="h-4 w-4 text-slate-300" />
                    ) : i === 2 ? (
                      <Medal className="h-4 w-4 text-amber-600" />
                    ) : (
                      <span className="text-xs font-mono text-white/30">{i + 1}</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-white">{p.name}</div>
                  <div className="text-center font-mono text-sm font-bold text-amber-300">
                    {p.score}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[11px] text-white/60">
                    <Target className="h-3 w-3" />
                    {acc !== null ? `${acc}%` : '-'}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[11px] text-white/60">
                    <Clock className="h-3 w-3" />
                    {avg !== null ? `${avg}s` : '-'}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-white/10 p-4">
          <div className="flex items-center gap-1 text-[11px] text-white/40">
            <Hash className="h-3 w-3" />
            共 {players.length} 位參賽者
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportImage}
              disabled={sorted.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 shadow-sm hover:bg-white/10 active:scale-95 disabled:opacity-30"
            >
              <ImageIcon className="h-4 w-4" /> 匯出圖片
            </button>
            <button
              type="button"
              onClick={exportText}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-400 active:scale-95"
            >
              <Download className="h-4 w-4" /> 複製排行榜
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
