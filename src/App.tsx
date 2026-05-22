import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Image,
  Info,
  ListOrdered,
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
  RefreshCcw,
} from 'lucide-react'
import Dropzone from './components/Dropzone'
import HowTo from './components/HowTo'
import PixelCanvas from './components/PixelCanvas'
import MaskedRevealPane from './components/MaskedRevealPane'
import PixelZoomPane from './components/PixelZoomPane'
import WarpPane from './components/WarpPane'
import ShuffleTilesPane from './components/ShuffleTilesPane'
import FullscreenStage from './components/FullscreenStage'
import Toolbar from './components/Toolbar'
import DeckControls from './components/DeckControls'
import RevealOriginalButton from './components/RevealOriginalButton'
import ScoreBoard, { type Player } from './components/ScoreBoard'
import GameTimer, { type RoundRecord } from './components/GameTimer'
import BuzzerPanel from './components/BuzzerPanel'
import ShakeDetector from './components/ShakeDetector'
import Leaderboard from './components/Leaderboard'
import DifficultySettings, { DEFAULT_RULES, getMultiplier } from './components/DifficultySettings'
import QRCodePanel from './components/QRCodePanel'
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

function App() {
  const { theme, toggle: toggleTheme } = useTheme()

  const [files, setFiles] = useState<File[]>([])
  const [index, setIndex] = useState(0)
  const [revealSeed, setRevealSeed] = useState(0)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)

  const [pixelSize, setPixelSize] = useState(80)
  const [grid, setGrid] = useState(true)
  const [gridAlpha, setGridAlpha] = useState(0.25)
  const [gridColor, setGridColor] = useState('#ffffff')
  const [background, setBackground] = useState<'transparent' | 'white'>('transparent')

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [stageOpen, setStageOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [gameMode, setGameMode] = useState<'pixel' | 'masked' | 'warp' | 'shuffle' | null>(null)
  const [revealAnswer, setRevealAnswer] = useState(false)

  // Multiplayer / scoring state
  const [players, setPlayers] = useState<Player[]>([])
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerResetSignal, setTimerResetSignal] = useState(0)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)

  // New features
  const [difficultyRules, setDifficultyRules] = useState(DEFAULT_RULES)
  const [countdownActive, setCountdownActive] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [autoShowLeaderboardOnEnd, setAutoShowLeaderboardOnEnd] = useState(false)

  // Transition
  const [transitionActive, setTransitionActive] = useState(false)
  const [transitionLabel, setTransitionLabel] = useState('')

  // Shake buzzer armed state (for shake detector)
  const [buzzerArmed, setBuzzerArmed] = useState(false)
  const [buzzerWinner, setBuzzerWinner] = useState<{ slotId: number; reactionMs: number } | null>(null)

  const currentFile = files[index] ?? null
  const sourceUrl = useObjectUrl(currentFile)
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const options: PixelateOptions = useMemo(
    () => ({ pixelSize, grid, gridAlpha, gridColor, background }),
    [pixelSize, grid, gridAlpha, gridColor, background],
  )

  // Sync sound + meta theme-color
  useEffect(() => {
    Sound.enabled = soundOn
  }, [soundOn])

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f1f5f9' : '#02133e')
    }
  }, [theme])

  // Auto-show leaderboard on last question reveal
  useEffect(() => {
    if (!autoShowLeaderboardOnEnd || !revealAnswer) return
    if (files.length > 0 && index === files.length - 1) {
      const t = setTimeout(() => setLeaderboardOpen(true), 1800)
      return () => clearTimeout(t)
    }
  }, [revealAnswer, index, files.length, autoShowLeaderboardOnEnd])

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
    const t = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    setRevealAnswer(false)
  }, [gameMode, index])

  useEffect(() => {
    if (!currentFile) setImgSize(null)
  }, [currentFile])

  // Stop timer when switching image or mode
  useEffect(() => {
    setTimerRunning(false)
  }, [index, gameMode])

  const canDownload = Boolean(sourceUrl)
  const currentMultiplier = getMultiplier(pixelSize, difficultyRules)

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
    triggerTransition(
      delta > 0 ? '下一題！' : '上一題！',
      () => {
        setIndex((i) => (i + delta + files.length) % files.length)
        setRevealSeed((s) => s + 1)
        setTimerRunning(false)
        setTimerResetSignal((s) => s + 1)
      }
    )
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
      const next = [cur!, ...rest]
      setFiles(next)
      setIndex(0)
      setRevealSeed((s) => s + 1)
      setTimerRunning(false)
      setTimerResetSignal((s) => s + 1)
    })
  }

  function openStage() {
    if (!gameMode) {
      setToast('請先選擇遊戲模式')
      return
    }
    setStageOpen(true)
  }

  function endGame() {
    if (players.length === 0) {
      setToast('目前沒有玩家資料')
      return
    }
    setLeaderboardOpen(true)
    setTimerRunning(false)
    Sound.success()
  }

  function startRoundWithCountdown() {
    setCountdownActive(true)
  }

  function onCountdownComplete() {
    setCountdownActive(false)
    setTimerRunning(true)
    setTimerResetSignal((s) => s + 1)
    Sound.go()
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

  function handleRoundComplete(record: RoundRecord) {
    setToast(`第 ${record.round} 輪完成！用時 ${record.seconds} 秒`)
  }

  function awardPlayer(playerId: string, points: number) {
    if (points <= 0) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, wrongCount: (p.wrongCount ?? 0) + 1 } : p,
        ),
      )
      return
    }
    const mult = getMultiplier(pixelSize, difficultyRules)
    const finalPoints = Math.round(points * mult)
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? {
              ...p,
              score: p.score + finalPoints,
              correctCount: (p.correctCount ?? 0) + 1,
            }
          : p,
      ),
    )
    setToast(`答對！+${finalPoints} 分（${mult}x 倍率）`)
  }

  // Shake buzzer integration
  const handleShakeBuzzer = useCallback(() => {
    if (!buzzerArmed || buzzerWinner) return
    const reaction = Date.now()
    setBuzzerWinner({ slotId: 99, reactionMs: reaction }) // 99 = shake slot
    Sound.buzzerLock()
  }, [buzzerArmed, buzzerWinner])

  return (
    <div className="min-h-dvh bg-[#02133e] text-white">
      {/* Intro Animation */}
      <IntroAnimation />

      {/* Transition Effect */}
      <TransitionEffect
        active={transitionActive}
        label={transitionLabel}
      />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:18px_18px] opacity-40" />
      </div>

      {/* Global countdown overlay */}
      <CountdownOverlay
        active={countdownActive}
        onComplete={onCountdownComplete}
        onCancel={() => setCountdownActive(false)}
      />

      <header className="mx-auto max-w-6xl px-4 pb-4 pt-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <ShieldCheck className="h-4 w-4 text-emerald-300" /> 圖片在本機瀏覽器處理，不上傳
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              像素化猜謎圖工具
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/65">
              把圖片變成一格一格的像素方塊，給小朋友玩「猜猜看」：從很難開始，逐步揭曉。
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-white/60">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('photo-game-intro-shown')
                window.location.reload()
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition"
              title="重新播放開場動畫"
            >
              <RefreshCcw className="h-3 w-3" /> 重播開場
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition"
              title={theme === 'dark' ? '切換亮色模式' : '切換暗色模式'}
            >
              {theme === 'dark' ? (
                <><Sun className="h-3.5 w-3.5 text-amber-300" /> 亮色</>
              ) : (
                <><Moon className="h-3.5 w-3.5 text-indigo-300" /> 暗色</>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition"
              title={soundOn ? '音效開啟' : '音效關閉'}
            >
              {soundOn ? (
                <><Volume2 className="h-3.5 w-3.5 text-emerald-300" /> 音效開</>
              ) : (
                <><VolumeX className="h-3.5 w-3.5 text-white/40" /> 音效關</>
              )}
            </button>
            <div className="flex items-center gap-1">
              <Info className="h-4 w-4" />
              建議：先用裁切工具把主角放大
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openStage}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-400"
            >
              <Expand className="h-4 w-4" /> 投影/全螢幕顯示
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 shadow-sm hover:bg-amber-500/20"
            >
              <Trophy className="h-4 w-4" /> 排行榜
            </button>
            <button
              type="button"
              onClick={endGame}
              disabled={players.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 shadow-sm hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Flag className="h-4 w-4" /> 結束比賽
            </button>
            <div className="text-[11px] text-white/45">全螢幕模式含計時器、搶答器、計分板、搖一搖</div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-10 lg:grid-cols-[380px_1fr]">
        <section className="flex flex-col gap-4">
          <Dropzone
            onFiles={(list) => setPlaylist(list)}
            fileName={currentFile?.name ?? null}
            count={files.length}
            hint="拖曳或選擇圖片後，用右側預覽調整難度，最後下載給小朋友猜。"
          />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">題庫控制</div>
                <div className="text-xs text-white/60">一次上傳多張，玩完按「下一張」就行</div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                <ListOrdered className="h-4 w-4" />
                {files.length ? `${index + 1} / ${files.length}` : '—'}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={!files.length || transitionActive}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> 上一張
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={!files.length || transitionActive}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                下一張 <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={shuffleDeck}
                disabled={files.length <= 1 || transitionActive}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                title="保留目前這張在第一張，其餘隨機"
              >
                <Shuffle className="h-4 w-4" /> 亂數順序
              </button>
            </div>

            {/* Deck progress */}
            {files.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-white/50">
                  <span>題庫進度</span>
                  <span>
                    {index + 1} / {files.length}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                    style={{ width: `${((index + 1) / files.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Auto leaderboard + end game controls */}
            {files.length > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-white/50">
                  <input
                    type="checkbox"
                    checked={autoShowLeaderboardOnEnd}
                    onChange={(e) => setAutoShowLeaderboardOnEnd(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-indigo-400"
                  />
                  最後一題公布答案後自動顯示排行榜
                </label>
              </div>
            )}
          </div>

          {/* Round start button with countdown */}
          {files.length > 0 && (
            <button
              type="button"
              onClick={startRoundWithCountdown}
              disabled={countdownActive}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 shadow-sm transition hover:bg-emerald-500/20 active:scale-95 disabled:opacity-40"
            >
              <Play className="h-4 w-4" /> 預備開始此輪（3,2,1 GO!）
            </button>
          )}

          <GameTimer
            running={timerRunning}
            setRunning={setTimerRunning}
            resetSignal={timerResetSignal}
            onTimeUp={onTimeUp}
            initialSeconds={60}
            currentRound={index + 1}
            onRoundComplete={handleRoundComplete}
          />

          <QRCodePanel />

          <BGMPlayer />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-sm font-semibold text-white">先選定模式再開始</div>
            <div className="grid gap-2 md:grid-cols-2">
              {(
                [
                  { key: 'pixel', title: '像素化猜謎', desc: '像素化後整張圖（預設 80px 最朦）' },
                  { key: 'masked', title: '局部放大猜謎', desc: '遮住整張圖，只露出放大鏡區域' },
                  { key: 'warp', title: '變形扭曲猜謎', desc: '整張圖扭曲變形，提高難度' },
                  { key: 'shuffle', title: '切割打亂猜謎', desc: '切塊後打亂位置；塊越小越難' },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setGameMode(m.key)}
                  className={
                    'rounded-2xl border p-3 text-left transition ' +
                    (gameMode === m.key
                      ? 'border-indigo-400/40 bg-indigo-500/10 ring-1 ring-indigo-400/20'
                      : 'border-white/10 bg-black/20 hover:bg-black/30')
                  }
                >
                  <div className="text-sm font-semibold text-white">{m.title}</div>
                  <div className="mt-1 text-xs text-white/60">{m.desc}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 text-[11px] leading-relaxed text-white/50">
              右側只會顯示你選的模式畫面。投影時請按上方「投影/全螢幕顯示」。
            </div>
          </div>

          <Toolbar
            pixelSize={pixelSize}
            setPixelSize={(n) => {
              setPixelSize(n)
              setRevealSeed((s) => s + 1)
            }}
            grid={grid}
            setGrid={setGrid}
            gridAlpha={gridAlpha}
            setGridAlpha={setGridAlpha}
            gridColor={gridColor}
            setGridColor={setGridColor}
            background={background}
            setBackground={setBackground}
            onRandomReveal={onRandomReveal}
            onDownload={onDownload}
            canDownload={canDownload}
          />

          <DifficultySettings rules={difficultyRules} onChange={setDifficultyRules} />

          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-semibold text-white">Kahoot 搶答模式</span>
            {currentMultiplier > 1 && (
              <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                {currentMultiplier}x 倍率
              </span>
            )}
          </div>
          <BuzzerPanel
            players={players}
            onAward={(id, points) => awardPlayer(id, points)}
            disabled={!sourceUrl}
          />

          <ScoreBoard players={players} setPlayers={setPlayers} showStats />

          <HowTo />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/15 text-sky-200">
                <Image className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">圖片資訊</div>
                <div className="text-xs text-white/60">了解尺寸可以幫你選像素大小</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-white/55">寬度</div>
                <div className="mt-1 font-mono text-white/85">{imgSize ? imgSize.w : '—'}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-white/55">高度</div>
                <div className="mt-1 font-mono text-white/85">{imgSize ? imgSize.h : '—'}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          {gameMode === 'pixel' ? (
            <>
              <PixelZoomPane sourceUrl={sourceUrl} options={options} revealSeed={revealSeed} />
            </>
          ) : gameMode === 'masked' ? (
            <MaskedRevealPane src={sourceUrl} />
          ) : gameMode === 'warp' ? (
            <WarpPane src={sourceUrl} />
          ) : gameMode === 'shuffle' ? (
            <ShuffleTilesPane src={sourceUrl} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
              請先在左側選擇一個遊戲模式。
            </div>
          )}
        </section>
      </main>

      <FullscreenStage
        open={stageOpen}
        title={
          gameMode === 'pixel'
            ? '像素化猜謎（投影）'
            : gameMode === 'masked'
              ? '局部放大猜謎（投影）'
              : gameMode === 'warp'
                ? '變形扭曲猜謎（投影）'
                : gameMode === 'shuffle'
                  ? '切割打亂猜謎（投影）'
                  : '投影模式'
        }
        onClose={() => setStageOpen(false)}
      >
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-start">
            <DeckControls
              hasDeck={files.length > 0}
              index={index}
              total={files.length}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
              onShuffle={shuffleDeck}
            />
            <GameTimer
              running={timerRunning}
              setRunning={setTimerRunning}
              resetSignal={timerResetSignal}
              onTimeUp={onTimeUp}
              initialSeconds={60}
              currentRound={index + 1}
              onRoundComplete={handleRoundComplete}
            />
            <div className="flex items-center justify-end">
              <RevealOriginalButton revealed={revealAnswer} setRevealed={setRevealAnswer} disabled={!sourceUrl} />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <BuzzerPanel
              players={players}
              onAward={(id, points) => awardPlayer(id, points)}
              disabled={!sourceUrl}
            />
            <ShakeDetector
              armed={buzzerArmed}
              onShake={handleShakeBuzzer}
              disabled={!sourceUrl}
            />
          </div>

          {gameMode === 'pixel' ? (
            <Toolbar
              pixelSize={pixelSize}
              setPixelSize={(n) => {
                setPixelSize(n)
                setRevealSeed((s) => s + 1)
              }}
              grid={grid}
              setGrid={setGrid}
              gridAlpha={gridAlpha}
              setGridAlpha={setGridAlpha}
              gridColor={gridColor}
              setGridColor={setGridColor}
              background={background}
              setBackground={setBackground}
              onRandomReveal={onRandomReveal}
              onDownload={onDownload}
              canDownload={canDownload}
            />
          ) : null}

          <div className="min-h-0 flex-1">
            {gameMode === 'pixel' ? (
              <div className="h-full rounded-2xl border border-white/10 bg-black/30 p-3">
                <PixelCanvas sourceUrl={sourceUrl} options={options} revealSeed={revealSeed} />
              </div>
            ) : gameMode === 'masked' ? (
              <MaskedRevealPane src={sourceUrl} />
            ) : gameMode === 'warp' ? (
              <WarpPane src={sourceUrl} />
            ) : gameMode === 'shuffle' ? (
              <ShuffleTilesPane src={sourceUrl} />
            ) : (
              <div className="grid h-full place-items-center text-sm text-white/60">請先選模式。</div>
            )}
          </div>

          <div className="shrink-0">
            <ScoreBoard players={players} setPlayers={setPlayers} showStats />
          </div>

          {revealAnswer && sourceUrl ? (
            <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4">
              <div className="absolute inset-0" onClick={() => setRevealAnswer(false)} />
              <img
                src={sourceUrl}
                alt="answer"
                draggable={false}
                className="relative max-h-[92vh] max-w-[92vw] rounded-2xl border border-white/10 bg-black/20 object-contain"
              />
            </div>
          ) : null}
        </div>
      </FullscreenStage>

      <footer className="mx-auto max-w-6xl px-4 pb-10">
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-[11px] font-semibold text-indigo-200">
              COPYRIGHT 2026 SKWSCOUT
            </div>
            <span>All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/40">
              音效 · 計時 · 搶答 · 倍率 · QR Code · 排行榜 · BGM · 主題 · 搖一搖 · 轉場
            </span>
            <div className="font-mono text-[11px] text-white/45">Session: {sessionId ?? '—'}</div>
          </div>
        </div>
      </footer>

      <Leaderboard open={leaderboardOpen} players={players} onClose={() => setLeaderboardOpen(false)} />

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-white/90 shadow-lg shadow-black/40 backdrop-blur">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

export default App
