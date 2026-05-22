import { X, Smartphone, Wifi } from 'lucide-react'

type Props = {
  url: string
  onClose: () => void
}

export default function QRCodeModal({ url, onClose }: Props) {
  if (!url) return null
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=12&color=ffffff&bgcolor=02133e&data=${encodeURIComponent(url)}`

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-black/85 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#02133e] p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-2 flex items-center justify-center gap-2 text-amber-300">
          <Smartphone className="h-5 w-5" />
          <h3 className="text-lg font-black tracking-wider">加入遊戲</h3>
        </div>

        <p className="mb-5 text-xs text-white/40">
          <Wifi className="mr-1 inline h-3 w-3" />
          請使用手機相機掃描 QR Code
        </p>

        <div className="mx-auto mb-4 overflow-hidden rounded-2xl border border-white/10">
          <img
            src={qrUrl}
            alt="QR Code"
            className="h-64 w-64 object-contain sm:h-80 sm:w-80"
            draggable={false}
          />
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
          <div className="text-[11px] text-white/30">網址</div>
          <div className="break-all text-xs text-white/60">{url}</div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-400 active:scale-[0.98]"
        >
          關閉並開始遊戲
        </button>
      </div>
    </div>
  )
}
