import { CheckCircle2, Lightbulb, Shuffle, SquareArrowOutUpRight } from 'lucide-react'

export default function HowTo() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-200">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">給老師/家長的小技巧</div>
          <div className="text-xs text-white/60">做成猜謎活動更好玩</div>
        </div>
      </div>

      <div className="grid gap-3 text-sm text-white/75 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-white/80">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" /> 先裁切、再像素化
          </div>
          <div className="text-xs text-white/60">
            先用手機或電腦把主角裁切到畫面中央，猜題會更集中、難度更可控。
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-white/80">
            <Shuffle className="h-4 w-4 text-indigo-300" /> 逐步揭曉
          </div>
          <div className="text-xs text-white/60">
            用「來一個提示」慢慢降低像素大小，讓小朋友一步步猜。
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-white/80">
            <SquareArrowOutUpRight className="h-4 w-4 text-sky-300" /> 建議輸出 PNG
          </div>
          <div className="text-xs text-white/60">
            PNG 比較不會糊掉；如果要放投影片也可以選白底，視覺更乾淨。
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] leading-relaxed text-white/45">
        這個工具會在瀏覽器中處理圖片，不會上傳到伺服器（適合教室使用）。
      </div>
    </div>
  )
}
