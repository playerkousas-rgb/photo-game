import { Eye, EyeOff } from 'lucide-react'

type Props = {
  revealed: boolean
  setRevealed: (v: boolean) => void
  disabled?: boolean
}

export default function RevealOriginalButton({ revealed, setRevealed, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setRevealed(!revealed)}
      className={
        'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ' +
        (revealed
          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20'
          : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10') +
        (disabled ? ' opacity-50' : '')
      }
      title={revealed ? '隱藏原圖' : '顯示原圖（公布答案）'}
    >
      {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {revealed ? '隱藏原圖' : '公布答案'}
    </button>
  )
}
