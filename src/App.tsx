import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  Play,
  Eye,
  EyeOff,
  Zap,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Trophy,
  Settings,
  X,
  Plus,
  Minus,
  Shuffle,
  Smartphone,
  Maximize2,
  Minimize2,
  Clock,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Dropzone from './components/Dropzone'
import PixelCanvas from './components/PixelCanvas'
import MaskedRevealPane from './components/MaskedRevealPane'
import PixelZoomPane from './components/PixelZoomPane'
import WarpPane from './components/WarpPane'
import ShuffleTilesPane from './components/ShuffleTilesPane'
import RevealOriginalButton from './components/RevealOriginalButton'
import CountdownOverlay from './components/CountdownOverlay'
import FullscreenStage from './components/FullscreenStage'
import Leaderboard from './components/Leaderboard'
import QRCodeModal from './components/QRCodeModal'
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

/* ==================== TYPES ==================== */
type GameMode = 'pixel' | 'masked' | 'warp' | 'shuffle'
type Phase = 'idle' | 'ready' | 'countdown' | 'playing' | 'revealed'
type Player = { id: string; name: string; score: number }

const MODE_LABELS: Record<GameMode, string> = {
  pixel: '像素化',
  masked: '局部放大',
  warp: '變形扭曲',
  shuffle: '切割打亂',
}

/* 8 difficulty levels, 7 drops needed */
const DIFFICULTY_STEPS = [80, 60, 45, 30, 20, 12, 6, 4]
const TIME_OPTIONS = [
  { sec: 30, label: '30 秒' },
  { sec: 60, label: '60 秒' },
  { sec: 90, label: '90 秒' },
  { sec: 120, label: '120 秒' },
  { sec: 0, label: '手動' },
]

/* ==================== HELPERS ==================== */
function createPlayer(name: string): Player {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    score: 0,
  }
}

function formatTime(totalSec: number) {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/* ==================== APP ==================== */
function App() {
  const { theme, toggle: toggleTheme } = useTheme()

  /* --- Core --- */
  const [files, setFiles] = useState<File[]>([])
  const [index, setIndex] = useState(0)
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [revealSeed, setRevealSeed] = useState(0)
  const [revealAnswer, setRevealAnswer] = useState(false)

  /* --- Game settings --- */
  const [totalTime, setTotalTime] = useState(60)
  const [pixelSize, setPixelSize] = useState(80)
  const [grid, setGrid] = useState(true)
  const [gridAlpha, setGridAlpha] = useState(0.25)
  const [gridColor, setGridColor] = useState('#ffffff')
  const [background, setBackground] = useState<'transparent' | 'white'>('transparent')

  /* --- Game flow (auto) --- */
  const [difficultyStep, setDifficultyStep] = useState(0)
  const [gameSeconds, setGameSeconds] = useState(0)
  const [showHUD, setShowHUD] = useState(true)

  /* --- Players --- */
  const [players, setPlayers] = useState<Player[]>([])
  const [newName, setNewName] = useState('')

  /* --- UI --- */
  const [soundOn, setSoundOn] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const currentFile = files[index] ?? null
  const sourceUrl = useObjectUrl(currentFile)
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const options: PixelateOptions = useMemo(
    () => ({ pixelSize, grid, gridAlpha, gridColor, background }),
    [pixelSize, grid, gridAlpha, gridColor, background],
  )

  /* Derived: interval per step */
  const stepInterval = totalTime > 0 ? totalTime / (DIFFICULTY_STEPS.length - 1) : 0
  const currentStepLabel = `${pixelSize}px`
  const isLastStep = difficultyStep >= DIFFICULTY_STEPS.length - 1

  /* ==================== EFFECTS ==================== */
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
    const t = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(t)
  }, [toast])

  /* --- Auto difficulty: proportional to total time --- */
  useEffect(() => {
    if (phase !== 'playing') return
    if (totalTime <= 0) return // manual mode

    let sec = 0
    let stepIdx = 0
    setDifficultyStep(0)
    setPixelSize(DIFFICULTY_STEPS[0])
    setGameSeconds(0)

    const interval = setInterval(() => {
      sec++
      setGameSeconds(sec)

      // Check if it's time for next step
      const stepsCompleted = Math.floor(sec / stepInterval)
      if (stepsCompleted > stepIdx && stepsCompleted < DIFFICULTY_STEPS.length) {
        stepIdx = stepsCompleted
        setDifficultyStep(stepIdx)
        setPixelSize(DIFFICULTY_STEPS[stepIdx])
        setRevealSeed((s) => s + 1)
        Sound.beep(500 + stepIdx * 80, 0.15)
        if (stepIdx < DIFFICULTY_STEPS.length - 1) {
          setToast(`難度降低！${DIFFICULTY_STEPS[stepIdx]}px`)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, totalTime, stepInterval])

  useEffect(() => {
    if (phase === 'playing') setRevealAnswer(false)
  }, [index, phase])

  /* ==================== ACTIONS ==================== */
  function setPlaylist(nextFiles: File[]) {
    const clean = nextFiles.filter((f) => f && f.size > 0 && f.type.startsWith('image/'))
    setFiles(clean)
    setIndex(0)
    setPhase(clean.length > 0 && gameMode ? 'ready' : 'idle')
    setRevealSeed((s) => s + 1)
  }

  function selectMode(m: GameMode) {
    setGameMode(m)
    if (files.length > 0) setPhase('ready')
  }

  function startGame() {
    if (!files.length || !gameMode) {
      setToast(files.length === 0 ? '請先上傳圖片' : '請選擇遊戲模式')
      return
    }
    setPhase('countdown')
  }

  function onCountdownComplete() {
    setPhase('playing')
    Sound.go()
    setSidebarOpen(false)
  }

  function reveal() {
    setRevealAnswer(true)
    setPhase('revealed')
    Sound.success()
  }

  function hideAnswer() {
    setRevealAnswer(false)
    if (phase === 'revealed') setPhase('playing')
  }

  function nextQuestion() {
    if (!files.length) return
    setIndex((i) => (i + 1) % files.length)
    setRevealAnswer(false)
    setPhase('countdown')
    setRevealSeed((s) => s + 1)
  }

  function prevQuestion() {
    if (!files.length) return
    setIndex((i) => (i - 1 + files.length) % files.length)
    setRevealAnswer(false)
    setPhase('countdown')
    setRevealSeed((s) => s + 1)
  }

  function shuffleDeck() {
    if (files.length <= 1) return
    const cur = files[index]
    const rest = files.filter((_, i) => i !== index)
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[rest[i], rest[j]] = [rest[j]!, rest[i]!]
    }
    setFiles([cur!, ...rest])
    setIndex(0)
    setRevealSeed((s) => s + 1)
    setPhase('countdown')
  }

  function addPlayer() {
    if (!newName.trim()) return
    setPlayers((prev) => [...prev, createPlayer(newName)])
    setNewName('')
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  function award(id: string, delta: number) {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, score: Math.max(0, p.score + delta) } : p)),
    )
    if (delta > 0) { Sound.success(); setToast(`+${delta} 分！`) }
  }

  function resetScores() {
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })))
  }

  /* ==================== DERIVED ==================== */
  const isPlaying = phase === 'playing' || phase === 'revealed'
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players])

  /* Time to next step (for HUD) */
  const nextStepAt = (difficultyStep + 1) * stepInterval
  const timeToNext = totalTime > 0 ? Math.max(0, Math.ceil(nextStepAt - gameSeconds)) : 0

  /* ==================== RENDER ==================== */
  return (
    <div className="min-h-dvh bg-[#02133e] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-500/8 blur-3xl" />
      </div>

      {/* Overlays */}
      <CountdownOverlay active={phase === 'countdown'} onComplete={onCountdownComplete} onCancel={() => setPhase('ready')} />
      {qrOpen && <QRCodeModal url={window.location.href} onClose={() => setQrOpen(false)} />}
      {leaderboardOpen && <Leaderboard open players={players} onClose={() => setLeaderboardOpen(false)} />}

      {/* ==================== SETUP SCREEN ==================== */}
      {phase === 'idle' && (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 pb-8 pt-12">
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">像素化猜謎圖工具</h1>
            <p className="mt-2 text-sm text-white/40">SKWSCOUT · 投影遊戲專用</p>
          </div>

          {/* Upload */}
          <div className="w-full">
            <Dropzone
              onFiles={(list) => setPlaylist(list)}
              fileName={currentFile?.name ?? null}
              count={files.length}
              hint="拖曳或點擊上傳圖片（支援多張）"
            />
          </div>

          {/* Mode select */}
          {files.length > 0 && (
            <div className="w-full space-y-3">
              <div className="text-center text-xs text-white/40">選擇遊戲模式</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['pixel', 'masked', 'warp', 'shuffle'] as GameMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => selectMode(m)}
                    className={`rounded-xl border p-4 text-center transition ${
                      gameMode === m
                        ? 'border-indigo-400/40 bg-indigo-500/15 text-white ring-1 ring-indigo-400/20'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/[0.07] hover:text-white/70'
                    }`}
                  >
                    <div className="mb-1 text-2xl">
                      {m === 'pixel' ? '▦' : m === 'masked' ? '◎' : m === 'warp' ? '〜' : '⊞'}
                    </div>
                    <div className="text-xs font-semibold">{MODE_LABELS[m]}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time setting */}
          {files.length > 0 && gameMode && (
            <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-sm font-semibold">總遊戲時間（難度自動按比例降低）</div>
              <div className="grid grid-cols-5 gap-2">
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.sec}
                    onClick={() => setTotalTime(opt.sec)}
                    className={`rounded-lg py-2 text-xs font-semibold transition ${
                      totalTime === opt.sec
                        ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30'
                        : 'bg-white/5 text-white/50 hover:bg-white/[0.07] hover:text-white/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {totalTime > 0 && (
                <div className="mt-2 text-[11px] text-white/30">
                  共 {DIFFICULTY_STEPS.length} 級難度，每 {stepInterval.toFixed(1)} 秒自動降一級
                </div>
              )}
              {totalTime === 0 && (
                <div className="mt-2 text-[11px] text-white/30">
                  手動模式：需自行點擊「來個提示」降低難度
                </div>
              )}
            </div>
          )}

          {/* Players (optional) */}
          {files.length > 0 && gameMode && (
            <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">玩家設定（可選）</span>
                <span className="text-[11px] text-white/30">{players.length} 人</span>
              </div>
              {players.length > 0 && (
                <div className="mb-2 space-y-1">
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1.5">
                      <span className="text-xs text-white/70">{p.name}</span>
                      <button onClick={() => removePlayer(p.id)} className="text-[10px] text-white/20 hover:text-rose-300 transition">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                  placeholder="輸入玩家名稱..."
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-indigo-400/40"
                />
                <button
                  onClick={addPlayer}
                  className="rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/30"
                >
                  加入
                </button>
              </div>
            </div>
          )}

          {/* Start */}
          {files.length > 0 && gameMode && (
            <button
              onClick={startGame}
              className="w-full rounded-2xl bg-indigo-500 py-4 text-lg font-black text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 active:scale-[0.98]"
            >
              <Play className="mr-2 inline h-5 w-5" />
              開始遊戲
            </button>
          )}

          {/* QR */}
          {files.length > 0 && (
            <button
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/50 transition hover:bg-white/[0.07] hover:text-white/70"
            >
              <Smartphone className="h-4 w-4" />
              顯示 QR Code 讓成員加入
            </button>
          )}

          {/* Footer */}
          <div className="mt-4 flex items-center gap-3 text-[11px] text-white/20">
            <span className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5">COPYRIGHT 2026 SKWSCOUT</span>
            <button onClick={toggleTheme} className="rounded-full p-1.5 transition hover:bg-white/5">
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => setSoundOn((s) => !s)} className="rounded-full p-1.5 transition hover:bg-white/5">
              {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* ==================== READY SCREEN ==================== */}
      {phase === 'ready' && (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 pb-8 pt-12">
          <div className="text-center">
            <div className="mb-2 text-sm text-white/40">已準備就緒</div>
            <h2 className="text-2xl font-black">第 {index + 1} / {files.length} 題</h2>
            <div className="mt-1 text-xs text-white/30">{currentFile?.name}</div>
          </div>

          {/* Preview */}
          <div className="relative aspect-video w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            {gameMode === 'pixel' && <PixelZoomPane sourceUrl={sourceUrl} options={options} revealSeed={revealSeed} />}
            {gameMode === 'masked' && <MaskedRevealPane src={sourceUrl} />}
            {gameMode === 'warp' && <WarpPane src={sourceUrl} />}
            {gameMode === 'shuffle' && <ShuffleTilesPane src={sourceUrl} />}
            <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-4xl font-black text-white/80">{MODE_LABELS[gameMode!]}</div>
                {totalTime > 0 && (
                  <div className="mt-1 text-xs text-white/40">
                    總時間 {totalTime} 秒 · 每 {stepInterval.toFixed(1)} 秒降一級
                  </div>
                )}
                {totalTime === 0 && (
                  <div className="mt-1 text-xs text-white/40">手動模式 · 自行控制難度</div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full max-w-sm rounded-2xl bg-indigo-500 py-4 text-lg font-black text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 active:scale-[0.98]"
          >
            <Play className="mr-2 inline h-5 w-5" />
            開始遊戲
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('idle')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/50 transition hover:bg-white/[0.07]"
            >
              返回設定
            </button>
            <button
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/50 transition hover:bg-white/[0.07]"
            >
              <Smartphone className="h-3.5 w-3.5" /> QR Code
            </button>
          </div>
        </div>
      )}

      {/* ==================== PLAYING / REVEALED ==================== */}
      {isPlaying && (
        <div className="flex h-dvh flex-col">
          <div className="relative flex-1 overflow-hidden">
            <div className="h-full w-full p-2 sm:p-4">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                {!revealAnswer ? (
                  <>
                    {gameMode === 'pixel' && <PixelCanvas sourceUrl={sourceUrl} options={options} revealSeed={revealSeed} />}
                    {gameMode === 'masked' && <MaskedRevealPane src={sourceUrl} />}
                    {gameMode === 'warp' && <WarpPane src={sourceUrl} />}
                    {gameMode === 'shuffle' && <ShuffleTilesPane src={sourceUrl} />}
                  </>
                ) : (
                  <img src={sourceUrl ?? ''} alt="answer" className="max-h-full max-w-full object-contain" draggable={false} />
                )}

                {/* Difficulty badge */}
                {!revealAnswer && (
                  <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-mono text-white/70 backdrop-blur">
                    <BarChart3 className="mr-1 inline h-3 w-3" />
                    {currentStepLabel}
                  </div>
                )}
                {revealAnswer && (
                  <div className="absolute left-3 top-3 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur">
                    <Eye className="mr-1 inline h-3 w-3" /> 答案
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              className={`absolute left-2 top-2 z-10 rounded-lg bg-black/40 p-2 text-white/50 backdrop-blur transition hover:bg-black/60 hover:text-white/80 ${sidebarOpen ? 'opacity-0' : 'opacity-100'}`}
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Floating sidebar */}
            {sidebarOpen && (
              <div className="absolute left-2 top-2 z-20 w-56 rounded-xl border border-white/10 bg-black/70 p-3 backdrop-blur-md">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/70">控制</span>
                  <button onClick={() => setSidebarOpen(false)} className="text-white/30 hover:text-white/60">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <button
                    onClick={revealAnswer ? hideAnswer : reveal}
                    className={`w-full rounded-lg py-1.5 text-xs font-semibold transition ${
                      revealAnswer
                        ? 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                        : 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                    }`}
                  >
                    {revealAnswer ? <><EyeOff className="mr-1 inline h-3 w-3" /> 隱藏答案</> : <><Eye className="mr-1 inline h-3 w-3" /> 公布答案</>}
                  </button>

                  <div className="flex gap-1.5">
                    <button onClick={prevQuestion} className="flex-1 rounded-lg bg-white/5 py-1.5 text-[11px] text-white/50 transition hover:bg-white/10">
                      <ChevronLeft className="mx-auto h-3.5 w-3.5" />
                    </button>
                    <button onClick={nextQuestion} className="flex-1 rounded-lg bg-white/5 py-1.5 text-[11px] text-white/50 transition hover:bg-white/10">
                      <ChevronRight className="mx-auto h-3.5 w-3.5" />
                    </button>
                    <button onClick={shuffleDeck} className="flex-1 rounded-lg bg-white/5 py-1.5 text-[11px] text-white/50 transition hover:bg-white/10">
                      <Shuffle className="mx-auto h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button onClick={() => setFullscreenOpen(true)} className="w-full rounded-lg bg-white/5 py-1.5 text-[11px] text-white/50 transition hover:bg-white/10">
                    <Maximize2 className="mr-1 inline h-3 w-3" /> 瀏覽器全螢幕
                  </button>

                  {/* Manual hint (for manual mode) */}
                  {totalTime === 0 && (
                    <button
                      onClick={() => {
                        setPixelSize((p) => Math.max(4, Math.round(p * 0.82)))
                        setRevealSeed((s) => s + 1)
                      }}
                      className="w-full rounded-lg bg-white/5 py-1.5 text-[11px] text-white/50 transition hover:bg-white/10"
                    >
                      來個提示（降低難度）
                    </button>
                  )}

                  <button onClick={() => setPhase('idle')} className="w-full rounded-lg bg-white/5 py-1.5 text-[11px] text-white/30 transition hover:bg-white/10 hover:text-white/50">
                    結束回到設定
                  </button>
                </div>

                {/* Quick scores */}
                {players.length > 0 && (
                  <div className="mt-2 border-t border-white/5 pt-2">
                    <div className="mb-1 text-[10px] text-white/30">計分</div>
                    {sortedPlayers.slice(0, 4).map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-0.5">
                        <span className="text-[11px] text-white/50">{p.name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-amber-300">{p.score}</span>
                          <button onClick={() => award(p.id, 1)} className="rounded bg-emerald-500/10 px-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20">+</button>
                          <button onClick={() => award(p.id, -1)} className="rounded bg-rose-500/10 px-1 text-[10px] text-rose-300 hover:bg-rose-500/20">-</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom HUD */}
          {showHUD && (
            <div className="shrink-0 border-t border-white/5 bg-black/40 backdrop-blur-md">
              <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-4">
                {/* Question counter */}
                <div className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-mono text-white/60">
                  {index + 1} / {files.length}
                </div>

                {/* Difficulty bar */}
                {!revealAnswer && totalTime > 0 && (
                  <div className="hidden flex-1 sm:block">
                    <div className="mb-0.5 flex items-center justify-between text-[10px] text-white/30">
                      <span>難度自動降低</span>
                      <span>{isLastStep ? '最簡單' : `下一級 ${timeToNext} 秒`}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {DIFFICULTY_STEPS.map((step, i) => (
                        <div
                          key={step}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                            i <= difficultyStep ? 'bg-indigo-400' : 'bg-white/10'
                          } ${i === difficultyStep ? 'ring-1 ring-indigo-300/30' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Timer */}
                <div className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-mono text-white/60">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {formatTime(gameSeconds)}
                </div>

                {/* Status */}
                <div className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  revealAnswer ? 'bg-emerald-500/15 text-emerald-200' : 'bg-indigo-500/15 text-indigo-200'
                }`}>
                  {revealAnswer ? '答案已公布' : '遊戲進行中'}
                </div>

                <button onClick={() => setShowHUD((h) => !h)} className="shrink-0 rounded-lg bg-white/5 p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white/60">
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {!showHUD && (
            <button
              onClick={() => setShowHUD(true)}
              className="fixed bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1.5 text-[10px] text-white/30 backdrop-blur transition hover:bg-black/60 hover:text-white/60"
            >
              顯示 HUD
            </button>
          )}
        </div>
      )}

      {/* ==================== FULLSCREEN STAGE ==================== */}
      <FullscreenStage
        open={fullscreenOpen}
        title={`${gameMode ? MODE_LABELS[gameMode] : ''} — 第 ${index + 1} 題`}
        onClose={() => setFullscreenOpen(false)}
      >
        <div className="flex h-full flex-col">
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2">
            {!revealAnswer ? (
              <>
                {gameMode === 'pixel' && <PixelCanvas sourceUrl={sourceUrl} options={options} revealSeed={revealSeed} />}
                {gameMode === 'masked' && <MaskedRevealPane src={sourceUrl} />}
                {gameMode === 'warp' && <WarpPane src={sourceUrl} />}
                {gameMode === 'shuffle' && <ShuffleTilesPane src={sourceUrl} />}
              </>
            ) : (
              <img src={sourceUrl ?? ''} alt="answer" className="h-full w-full object-contain" draggable={false} />
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={revealAnswer ? hideAnswer : reveal}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                revealAnswer ? 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25' : 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
              }`}
            >
              {revealAnswer ? '隱藏答案' : '公布答案'}
            </button>
            <button onClick={nextQuestion} className="rounded-xl bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10">下一題</button>
            <div className="ml-auto rounded-lg bg-white/5 px-3 py-1.5 text-xs font-mono text-white/40">
              {index + 1} / {files.length} · {currentStepLabel}
            </div>
          </div>
        </div>
      </FullscreenStage>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-white/90 shadow-lg backdrop-blur">
          {toast}
        </div>
      )}

      {/* Copyright */}
      <div className="fixed bottom-1 right-2 z-10 text-[10px] text-white/10">COPYRIGHT 2026 SKWSCOUT</div>
    </div>
  )
}

export default App
