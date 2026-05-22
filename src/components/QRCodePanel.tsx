import { useEffect, useMemo, useState } from 'react'
import { QrCode, Copy, Check, Smartphone, Link, Wifi } from 'lucide-react'

export default function QRCodePanel() {
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrl(window.location.href)
    }
  }, [])

  const qrUrl = useMemo(() => {
    if (!url) return ''
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&color=ffffff&bgcolor=02133e&data=${encodeURIComponent(url)}`
  }, [url])

  function copyUrl() {
    if (!url) return
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-sky-300" />
        <span className="text-sm font-semibold text-white">手機掃碼加入</span>
      </div>

      <div className="mb-2 text-[11px] text-white/50">
        <Wifi className="mr-1 inline h-3 w-3" />
        讓其他玩家在同一區網掃描 QR Code 開啟此頁面，即可同步參與。
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="QR Code"
            className="h-32 w-32 rounded-xl border border-white/10 bg-[#02133e] object-contain"
            draggable={false}
          />
        ) : (
          <div className="grid h-32 w-32 place-items-center rounded-xl border border-white/10 bg-white/5 text-[11px] text-white/40">
            <QrCode className="h-8 w-8 text-white/20" />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
            <Link className="h-3.5 w-3.5 shrink-0 text-white/40" />
            <input
              readOnly
              value={url || '載入中...'}
              className="min-w-0 flex-1 bg-transparent text-[11px] text-white/60 outline-none"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="rounded bg-white/5 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="text-[11px] leading-relaxed text-white/40">
            <span className="text-amber-300/80">提示：</span>同一裝置上可分配不同按鍵給不同玩家（按 1~4 搶答）。
            多台裝置建議在同一 Wi-Fi 下使用，以確保 URL 可互相訪問。
          </div>
        </div>
      </div>
    </div>
  )
}
