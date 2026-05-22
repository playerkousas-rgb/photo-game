import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Image,
  ShieldCheck,
  Shuffle,
  Trophy,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Sun,
  Moon,
  Flag,
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  RefreshCw,
  Timer,
  Users,
  Music,
  Star,
  Smartphone,
  Info,
  X,
  Plus,
  Minus,
} from 'lucide-react'
import Dropzone from './components/Dropzone'
import PixelCanvas from './components/PixelCanvas'
import MaskedRevealPane from './components/MaskedRevealPane'
import PixelZoomPane from './components/PixelZoomPane'
import WarpPane from './components/WarpPane'
import ShuffleTilesPane from './components/ShuffleTilesPane'
import FullscreenStage from './components/FullscreenStage'
import RevealOriginalButton from './components/RevealOriginalButton'
import GameTimer, { type RoundRecord } from './components/GameTimer'
import BuzzerPanel from './components/BuzzerPanel'
import ShakeDetector from './components/ShakeDetector'
import Leaderboard from './components/Leaderboard'
import CountdownOverlay from './components/CountdownOverlay'
import BGMPlayer from './components/BGMPlayer'
import IntroAnimation from './components/IntroAnimation'
import TransitionEffect from './components/TransitionEffect'
import { useTheme } from './context/ThemeContext'
import { Sound } from './lib/sound'
import { canvasToBlob, PixelateOptions, pixelateToCanvas } from './lib/imagePixelate'
import { useObjectUrl } from './lib/useObjectUrl'
import {
  createSessionId,
  getSessionIdFromUrl,
  readSession,
  setSessionIdToUrl,
} from './lib/session'

/* ---------- Types ---------- */
type GameMode = 'pixel' | 'masked' | 'warp' | 'shuffle'
type Player = {
  id: string
  name: string
  score: number
  correctCount?: number
  wrongCount?: number
  roundTimes?: number[]
}

/* ---------- Helpers ---------- */
function createPlayer(name: string): Player {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    roundTimes: [],
  }
}

function getModeLabel(m: GameMode | null) {
  switch (m) {
    case 'pixel': return '像素化猜謎'
    case 'masked': return '局部放大猜謎'
    case 'warp': return '變形扭曲猜謎'
    case 'shuffle': return '切割打亂猜謎'
    default: return '選擇模式'
  }
}

/* ========== APP ========== */
function App() {
  const { theme, toggle: toggleTheme } = useTheme()

  /* --- core state --- */
  const [files, setFiles] = useState<File[]>([])
  const [index, setIndex] = useState(0)
  const [revealSeed, setRevealSeed] = useState(0)
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [revealAnswer, setRevealAnswer] = useState(false)

  /* --- pixel settings (defaults, rarely changed) --- */
  const [pixelSize, setPixelSize] = useState(80)
  const [grid, setGrid] = useState(true)
  const [gridAlpha, setGridAlpha] = useState(0.25)
  const [gridColor, setGridColor] = useState('#ffffff')
  const [background, setBackground] = useState<'transparent' | 'white'>('transparent')

  /* --- multiplayer --- */
  const [players, setPlayers] = useState<Player[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')

  /* --- timer --- */
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerResetSignal, setTimerResetSignal] = useState(0)

  /* --- overlays / flags --- */
  const [countdownActive, setCountdownActive] = useState(false)
  const [stageOpen, setStageOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [transitionActive, setTransitionActive] = useState(false)
  const [transitionLabel, setTransitionLabel] = useState('')

  /* --- settings panel toggle --- */
  const [showSettings, setShowSettings] = useState(false)

  /* --- sound / BGM / misc --- */
  const [soundOn, setSoundOn] = useState(true)
  const [autoLeaderboard, setAutoLeaderboard] = useState(false)

  const currentFile = files[index] ?? null
  const sourceUrl = useObjectUrl(currentFile)
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const options: PixelateOptions = useMemo(
    () => ({ pixelSize, grid, gridAlpha, gridColor, background }),
    [pixelSize, grid, gridAlpha, gridColor, background],
  )

  /* --- effects --- */
  useEffect(() => { Sound.enabled = soundOn }, [soundOn])

  useEffect(() => {
    const fromUrl = getSessionIdFromUrl()
    const id = fromUrl ?? createSessionId()
    setSessionId(id)
    setSessionIdToUrl(id)
    if (fromUrl) {
      const s = readSession(fromUrl)
      if (s) {
        setIndex(s.index ?? 0)
        setPixelSize(s.pixelSize ?? 80)
        setGrid(Boolean(s.grid))
        setGridAlpha(typeof s.gridAlpha === 'number' ? s.gridAlpha : 0.25)
        setGridColor(s.gridColor ?? '#ffffff')
        setBackground(s.background ?? 'transparent')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    setRevealAnswer(false)
  }, [gameMode, index])

  useEffect(() => {
    if (!autoLeaderboard || !revealAnswer) return
    if (files.length > 0 && index === files.length - 1) {
      const t = setTimeout(() => setLeaderboardOpen(true), 1800)
      return () => clearTimeout(t)
    }
  }, [revealAnswer, index, files.length, autoLeaderboard])

  /* --- actions --- */
  function setPlaylist(nextFiles: File[]) {
    const clean = nextFiles.filter((f) => f && f.size > 0 && f.type.startsWith('image/'))
    setFiles(clean)
    setIndex(0)
    setRevealSeed((s) => s + 1)
    setTimerRunning(false)
    setTimerResetSignal((s) => s + 1)
  }

  function triggerTransition(label: string, onDone?: () => void) {
    setTransitionLabel(label)
    setTransitionActive(true)
    setTimeout(() => {
      setTransitionActive(false)
      onDone?.()
    }, 1200)
  }

  function go(delta: number) {
    if (!files.length) return
    triggerTransition(delta > 0 ? '下一題！' : '上一題！', () => {
      setIndex((i) => (i + delta + files.length) % files.length)
      setRevealSeed((s) => s + 1)
      setTimerRunning(false)
      setTimerResetSignal((s) => s + 1)
    })
  }

  function shuffleDeck() {
    if (files.length <= 1) return
    triggerTransition('重新洗牌！', () => {
      const cur = files[index]
      const rest = files.filter((_, i) => i !== index)
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[rest[i], rest[j]] = [rest[j]!, rest[i]!]
      }
      setFiles([cur!, ...rest])
      setIndex(0)
      setRevealSeed((s) => s + 1)
      setTimerRunning(false)
      setTimerResetSignal((s) => s + 1)
    })
  }

  function startRound() {
    setCountdownActive(true)
  }

  function onCountdownComplete() {
    setCountdownActive(false)
    setTimerRunning(true)
    setTimerResetSignal((s) => s + 1)
    Sound.go()
  }

  function openStage() {
    if (!gameMode) { setToast('請先選擇遊戲模式'); return }
    setStageOpen(true)
  }

  function endGame() {
    if (!players.length) { setToast('目前沒有玩家'); return }
    setLeaderboardOpen(true)
    setTimerRunning(false)
    Sound.success()
  }

  async function onDownload() {
    if (!sourceUrl) return
    const img = document.createElement('img')
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.src = sourceUrl
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('圖片載入失敗'))
    })
    const canvas = exportCanvasRef.current ?? document.createElement('canvas')
    exportCanvasRef.current = canvas
    pixelateToCanvas(img, canvas, options)
    const type = background === 'transparent' ? 'image/png' : 'image/jpeg'
    const blob = await canvasToBlob(canvas, type, 0.92)
    const dlUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = dlUrl
    a.download = `pixel-guess-${pixelSize}px.${type === 'image/png' ? 'png' : 'jpg'}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(dlUrl)
  }

  function onRandomReveal() {
    setPixelSize((p) => Math.max(4, Math.round(p * 0.82)))
    setRevealSeed((s) => s + 1)
  }

  function onTimeUp() {
    setToast('時間到！公布答案囉')
    setTimerRunning(false)
  }

  function handleRoundComplete(r: RoundRecord) {
    setToast(`第 ${r.round} 輪完成！${r.seconds} 秒`)
  }

  function addPlayer() {
    if (!newPlayerName.trim()) return
    setPlayers((prev) => [...prev, createPlayer(newPlayerName)])
    setNewPlayerName('')
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  function award(id: string, delta: number) {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const nextScore = Math.max(0, p.score + delta)
        return {
          ...p,
          score: nextScore,
          correctCount: (p.correctCount ?? 0) + (delta > 0 ? 1 : 0),
          wrongCount: (p.wrongCount ?? 0) + (delta < 0 ? 1 : 0),
        }
      }),
    )
  }

  function resetAllScores() {
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0, correctCount: 0, wrongCount: 0, roundTimes: [] })))
  }

  /* --- derived --- */
  const hasFiles = files.length > 0
  const isPlaying = hasFiles && gameMode !== null
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players],
  )

  /* ==================== RENDER ==================== */
  return (
    <div className="min-h-dvh bg-[#02133e] text-white">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:20px_20px] opacity-30" />
      </div>

      <IntroAnimation />
      <CountdownOverlay active={countdownActive} onComplete={onCountdownComplete} onCancel={() => setCountdownActive(false)} />
      <TransitionEffect active={transitionActive} label={transitionLabel} />

      {/* ---------- HEADER ---------- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 pt-6">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/20 text-indigo-200">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight sm:text-xl">
              像素化猜謎圖工具
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-white/40">
              <ShieldCheck className="h-3 w-3" /> 圖片在本機處理，不上傳
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="rounded-lg bg-white/5 p-2 text-white/50 hover:bg-white/10 hover:text-white/80 transition"
            title={soundOn ? '音效開' : '音效關'}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-lg bg-white/5 p-2 text-white/50 hover:bg-white/10 hover:text-white/80 transition"
            title={theme === 'dark' ? '亮色模式' : '暗色模式'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setLeaderboardOpen(true)}
            className="rounded-lg bg-amber-500/15 p-2 text-amber-200 hover:bg-amber-500/25 transition"
            title="排行榜"
          >
            <Trophy className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ---------- MAIN ---------- */}
      <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 lg:grid-cols-[320px_1fr]">
        {/* ===== LEFT SIDEBAR ===== */}
        <section className="flex flex-col gap-3">
          {/* 1. Upload */}
          <Dropzone
            onFiles={(list) => setPlaylist(list)}
            fileName={currentFile?.name ?? null}
            count={files.length}
            hint="拖曳圖片或點擊上傳（支援多張）"
          />

          {/* 2. Mode selector (compact) */}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: 'pixel' as const, label: '像素化', icon: '▦' },
                { key: 'masked' as const, label: '局部放大', icon: '◎' },
                { key: 'warp' as const, label: '變形扭曲', icon: '〜' },
                { key: 'shuffle' as const, label: '切割打亂', icon: '⊞' },
              ]
            ).map((m) => (
              <button
                key={m.key}
                onClick={() => setGameMode(m.key)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  gameMode === m.key
                    ? 'border-indigo-400/40 bg-indigo-500/15 text-white ring-1 ring-indigo-400/20'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/[0.07] hover:text-white/80'
                }`}
              >
                <div className="text-lg leading-none">{m.icon}</div>
                <div className="mt-1 text-xs font-medium">{m.label}</div>
              </button>
            ))}
          </div>

          {/* 3. Play controls (only when active) */}
          {isPlaying && (
            <>
              {/* Progress + deck nav */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-white/50">
                    {index + 1} / {files.length}
                  </span>
                  <span className="truncate max-w-[180px] text-white/70 text-[11px]">
                    {currentFile?.name}
                  </span>
                </div>
                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                    style={{ width: `${((index + 1) / files.length) * 100}%` }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => go(-1)}
                    disabled={transitionActive}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="mx-auto h-4 w-4" />
                  </button>
                  <button
                    onClick={() => go(1)}
                    disabled={transitionActive}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
                  >
                    <ChevronRight className="mx-auto h-4 w-4" />
                  </button>
                  <button
                    onClick={shuffleDeck}
                    disabled={files.length <= 1 || transitionActive}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
                    title="亂數順序"
                  >
                    <Shuffle className="mx-auto h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Big action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setRevealAnswer((v) => !v)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold transition active:scale-95 ${
                    revealAnswer
                      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  {revealAnswer ? '隱藏答案' : '公布答案'}
                </button>
                <button
                  onClick={startRound}
                  className="flex flex-col items-center gap-1 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2 py-3 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 active:scale-95"
                >
                  <Play className="h-4 w-4" />
                  預備開始
                </button>
                <button
                  onClick={onDownload}
                  disabled={!sourceUrl}
                  className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-xs font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-30 active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  下載圖片
                </button>
              </div>

              {/* Pixel slider (only for pixel mode) */}
              {gameMode === 'pixel' && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-white/60">難度（像素大小）</span>
                    <span className="text-xs font-mono text-white/80">{pixelSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={80}
                    value={pixelSize}
                    onChange={(e) => {
                      setPixelSize(parseInt(e.target.value))
                      setRevealSeed((s) => s + 1)
                    }}
                    className="w-full accent-indigo-400"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={onRandomReveal}
                      className="flex-1 rounded-lg bg-white/5 py-1.5 text-[11px] text-white/60 hover:bg-white/10 transition flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" /> 來個提示
                    </button>
                    <button
                      onClick={openStage}
                      className="flex-1 rounded-lg bg-indigo-500/20 py-1.5 text-[11px] text-indigo-200 hover:bg-indigo-500/30 transition flex items-center justify-center gap-1"
                    >
                      <Expand className="h-3 w-3" /> 投影全螢幕
                    </button>
                  </div>
                </div>
              )}

              {/* Simple timer */}
              <GameTimer
                running={timerRunning}
                setRunning={setTimerRunning}
                resetSignal={timerResetSignal}
                onTimeUp={onTimeUp}
                initialSeconds={60}
                currentRound={index + 1}
                onRoundComplete={handleRoundComplete}
              />

              {/* Compact Scoreboard */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
                    <Users className="h-3.5 w-3.5" /> 計分板
                  </div>
                  {players.length > 0 && (
                    <button
                      onClick={resetAllScores}
                      className="text-[10px] text-white/30 hover:text-white/60 transition"
                    >
                      重置分數
                    </button>
                  )}
                </div>

                {players.length === 0 ? (
                  <div className="text-[11px] text-white/40">新增玩家後開始計分</div>
                ) : (
                  <div className="mb-2 space-y-1">
                    {sortedPlayers.map((p, i) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono w-4 ${i === 0 ? 'text-amber-300' : 'text-white/30'}`}>
                            {i === 0 ? '🥇' : i + 1}
                          </span>
                          <span className="text-xs text-white/80">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="min-w-[1.5rem] text-right text-xs font-mono font-bold text-amber-300">
                            {p.score}
                          </span>
                          <button
                            onClick={() => award(p.id, 1)}
                            className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-500/25 transition"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => award(p.id, -1)}
                            className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-300 hover:bg-rose-500/25 transition"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removePlayer(p.id)}
                            className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30 hover:text-white/60 transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                    placeholder="輸入名稱..."
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-indigo-400/40"
                  />
                  <button
                    onClick={addPlayer}
                    className="rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/30 transition"
                  >
                    加入
                  </button>
                </div>
              </div>

              {/* Buzzer (simplified) */}
              <BuzzerPanel
                players={players}
                onAward={(id, pts) => {
                  setPlayers((prev) =>
                    prev.map((p) =>
                      p.id === id
                        ? { ...p, score: p.score + pts, correctCount: (p.correctCount ?? 0) + (pts > 0 ? 1 : 0) }
                        : p,
                    ),
                  )
                  if (pts > 0) setToast(`+${pts} 分！`)
                }}
                disabled={!sourceUrl}
              />

              {/* Shake detector for mobile */}
              <ShakeDetector
                armed={false}
                onShake={() => {}}
                disabled={!sourceUrl}
              />
            </>
          )}

          {/* 4. Settings (collapsed by default) */}
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.07] transition"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" />
              更多設定
            </div>
            {showSettings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showSettings && (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
              {/* Grid settings */}
              <div>
                <div className="mb-1.5 text-xs text-white/60">格線</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGrid((g) => !g)}
                    className={`rounded-lg px-2 py-1 text-[11px] transition ${
                      grid ? 'bg-indigo-500/20 text-indigo-200' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {grid ? '開啟' : '關閉'}
                  </button>
                  <input
                    type="color"
                    value={gridColor}
                    onChange={(e) => setGridColor(e.target.value)}
                    className="h-6 w-6 rounded border-0 bg-transparent p-0"
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(gridAlpha * 100)}
                    onChange={(e) => setGridAlpha(parseInt(e.target.value) / 100)}
                    className="flex-1 accent-indigo-400"
                    disabled={!grid}
                  />
                </div>
              </div>

              {/* Export bg */}
              <div>
                <div className="mb-1.5 text-xs text-white/60">匯出背景</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBackground('transparent')}
                    className={`rounded-lg px-3 py-1 text-[11px] transition ${
                      background === 'transparent' ? 'bg-indigo-500/20 text-indigo-200' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    透明 PNG
                  </button>
                  <button
                    onClick={() => setBackground('white')}
                    className={`rounded-lg px-3 py-1 text-[11px] transition ${
                      background === 'white' ? 'bg-indigo-500/20 text-indigo-200' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    白底
                  </button>
                </div>
              </div>

              {/* BGM */}
              <BGMPlayer />

              {/* QR Code */}
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-xs text-white/60">
                  <Smartphone className="h-3.5 w-3.5" /> 手機掃碼加入
                </div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=8&color=ffffff&bgcolor=02133e&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  alt="QR"
                  className="h-24 w-24 rounded-lg border border-white/10 object-contain"
                  draggable={false}
                />
              </div>

              {/* Auto leaderboard */}
              <label className="flex items-center gap-2 text-[11px] text-white/50">
                <input
                  type="checkbox"
                  checked={autoLeaderboard}
                  onChange={(e) => setAutoLeaderboard(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-indigo-400"
                />
                最後一題自動顯示排行榜
              </label>

              {/* End game */}
              <button
                onClick={endGame}
                disabled={!players.length}
                className="w-full rounded-lg border border-rose-400/20 bg-rose-500/10 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-30 transition"
              >
                <Flag className="mr-1 inline h-3.5 w-3.5" /> 結束比賽看排行榜
              </button>

              {/* Help */}
              <div className="rounded-lg bg-white/[0.03] p-2.5">
                <div className="mb-1 flex items-center gap-1 text-[11px] text-white/40">
                  <Info className="h-3 w-3" /> 小技巧
                </div>
                <ul className="list-disc pl-4 text-[11px] leading-relaxed text-white/30">
                  <li>先裁切主角再上傳，猜題更集中</li>
                  <li>用「來個提示」逐步降低難度</li>
                  <li>投影模式適合教室大螢幕</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* ===== RIGHT PREVIEW ===== */}
        <section className="flex flex-col gap-3">
          {/* Mode badge */}
          {gameMode && (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Star className="h-3.5 w-3.5 text-indigo-300" />
                當前模式：<span className="font-semibold text-white/80">{getModeLabel(gameMode)}</span>
              </div>
              <button
                onClick={() => setGameMode(null)}
                className="text-[11px] text-white/30 hover:text-white/60 transition"
              >
                重選
              </button>
            </div>
          )}

          {/* Preview area */}
          <div className="relative flex-1 min-h-[300px] rounded-2xl border border-white/10 bg-white/5 p-3 lg:min-h-[420px]">
            {gameMode === 'pixel' ? (
              <PixelZoomPane sourceUrl={sourceUrl} options={options} revealSeed={revealSeed} />
            ) : gameMode === 'masked' ? (
              <MaskedRevealPane src={sourceUrl} />
            ) : gameMode === 'warp' ? (
              <WarpPane src={sourceUrl} />
            ) : gameMode === 'shuffle' ? (
              <ShuffleTilesPane src={sourceUrl} />
            ) : (
              <div className="grid h-full place-items-center text-sm text-white/40">
                <div className="text-center">
                  <Image className="mx-auto mb-2 h-10 w-10 text-white/10" />
                  <p>請先上傳圖片並選擇遊戲模式</p>
                </div>
              </div>
            )}
          </div>

          {/* Image info (subtle) */}
          {currentFile && (
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-[11px] text-white/30">
              <span>{currentFile.name}</span>
              <span>{Math.round(currentFile.size / 1024)} KB</span>
            </div>
          )}
        </section>
      </main>

      {/* ---------- FULLSCREEN STAGE ---------- */}
      <FullscreenStage
        open={stageOpen}
        title={`${getModeLabel(gameMode)}（投影）`}
        onClose={() => setStageOpen(false)}
      >
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto">
          <div className="flex items-center gap-2">
            <button onClick={() => go(-1)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-white/40">{index + 1} / {files.length}</span>
            <button onClick={() => go(1)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="ml-auto flex items-center gap-2">
              <RevealOriginalButton revealed={revealAnswer} setRevealed={setRevealAnswer} disabled={!sourceUrl} />
              <button onClick={startRound} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                <Play className="mr-1 inline h-3.5 w-3.5" /> 預備
              </button>
            </div>
          </div>

          <GameTimer
            running={timerRunning}
            setRunning={setTimerRunning}
            resetSignal={timerResetSignal}
            onTimeUp={onTimeUp}
            initialSeconds={60}
            currentRound={index + 1}
            onRoundComplete={handleRoundComplete}
          />

          <BuzzerPanel players={players} onAward={(id, pts) => award(id, pts)} disabled={!sourceUrl} />
          <ShakeDetector armed={false} onShake={() => {}} disabled={!sourceUrl} />

          {gameMode === 'pixel' && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="text-xs text-white/60">{pixelSize}px</span>
              <input
                type="range" min={4} max={80} value={pixelSize}
                onChange={(e) => { setPixelSize(parseInt(e.target.value)); setRevealSeed((s) => s + 1) }}
                className="flex-1 accent-indigo-400"
              />
              <button onClick={onRandomReveal} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10">
                <RefreshCw className="h-3 w-3" /> 提示
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-black/30 p-3">
            {gameMode === 'pixel' ? (
              <PixelCanvas sourceUrl={sourceUrl} options={options} revealSeed={revealSeed} />
            ) : gameMode === 'masked' ? (
              <MaskedRevealPane src={sourceUrl} />
            ) : gameMode === 'warp' ? (
              <WarpPane src={sourceUrl} />
            ) : gameMode === 'shuffle' ? (
              <ShuffleTilesPane src={sourceUrl} />
            ) : null}
          </div>
        </div>
      </FullscreenStage>

      {/* ---------- REVEAL ANSWER OVERLAY ---------- */}
      {revealAnswer && sourceUrl && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4" onClick={() => setRevealAnswer(false)}>
          <img
            src={sourceUrl}
            alt="answer"
            draggable={false}
            className="max-h-[92vh] max-w-[92vw] rounded-2xl border border-white/10 object-contain"
          />
        </div>
      )}

      {/* ---------- LEADERBOARD ---------- */}
      <Leaderboard open={leaderboardOpen} players={players} onClose={() => setLeaderboardOpen(false)} />

      {/* ---------- FOOTER ---------- */}
      <footer className="mx-auto max-w-6xl px-4 pb-6">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[11px] text-white/40">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-200">
              COPYRIGHT 2026 SKWSCOUT
            </span>
          </div>
          <span>Session: {sessionId ?? '—'}</span>
        </div>
      </footer>

      {/* ---------- TOAST ---------- */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-white/90 shadow-lg backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
