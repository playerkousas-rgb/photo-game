import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Image,
  Info,
  ListOrdered,
  ShieldCheck,
  Shuffle,
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
import { canvasToBlob, PixelateOptions, pixelateToCanvas } from './lib/imagePixelate'
import { useObjectUrl } from './lib/useObjectUrl'
import {
  createSessionId,
  getSessionIdFromUrl,
  readSession,
  setSessionIdToUrl,
} from './lib/session'

function App() {
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

  const currentFile = files[index] ?? null
  const sourceUrl = useObjectUrl(currentFile)
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const options: PixelateOptions = useMemo(
    () => ({ pixelSize, grid, gridAlpha, gridColor, background }),
    [pixelSize, grid, gridAlpha, gridColor, background],
  )

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

  const canDownload = Boolean(sourceUrl)

  function setPlaylist(nextFiles: File[]) {
    const clean = nextFiles.filter((f) => f && f.size > 0 && f.type.startsWith('image/'))
    setFiles(clean)
    setIndex(0)
    setRevealSeed((s) => s + 1)
  }

  function go(delta: number) {
    if (!files.length) return
    setIndex((i) => {
      const n = (i + delta + files.length) % files.length
      return n
    })
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
    const next = [cur!, ...rest]
    setFiles(next)
    setIndex(0)
    setRevealSeed((s) => s + 1)
  }

  function openStage() {
    if (!gameMode) {
      setToast('請先選擇遊戲模式')
      return
    }
    setStageOpen(true)
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
    // make it slightly easier each time
    setPixelSize((p) => Math.max(4, Math.round(p * 0.82)))
    setRevealSeed((s) => s + 1)
  }

  return (
    <div className="min-h-dvh bg-[#070a14] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:18px_18px] opacity-40" />
      </div>

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

          <div className="flex items-center gap-2 text-xs text-white/60">
            <Info className="h-4 w-4" />
            建議：先用裁切工具把主角放大，再丟進來效果更好
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
            <div className="text-[11px] text-white/45">只會把「遊戲畫面」全螢幕，不會把整個 App 放大。</div>
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
                disabled={!files.length}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> 上一張
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={!files.length}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                下一張 <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={shuffleDeck}
                disabled={files.length <= 1}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                title="保留目前這張在第一張，其餘隨機"
              >
                <Shuffle className="h-4 w-4" /> 亂數順序
              </button>
            </div>
          </div>

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
        <div className="flex h-full min-h-0 flex-col gap-3">
          {/* Keep key controls visible in fullscreen so users don't lose buttons */}
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <DeckControls
              hasDeck={files.length > 0}
              index={index}
              total={files.length}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
              onShuffle={shuffleDeck}
            />
            <div className="flex items-center justify-end">
              <RevealOriginalButton revealed={revealAnswer} setRevealed={setRevealAnswer} disabled={!sourceUrl} />
            </div>
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
        <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60 md:flex-row md:items-center">
          <div>© 2026 SKWSCOUT. All rights reserved.</div>
          <div className="font-mono text-[11px] text-white/45">id: {sessionId ?? '—'}</div>
        </div>
      </footer>

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-white/90 shadow-lg shadow-black/40 backdrop-blur">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

export default App
