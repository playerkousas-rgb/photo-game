import { useEffect, useMemo, useRef } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export default function FullscreenStage({ open, title, onClose, children }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const el = stageRef.current
    if (!el) return
    ;(async () => {
      try {
        if (!document.fullscreenElement) await el.requestFullscreen()
      } catch {
        // ignore
      }
    })()
  }, [open])

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) onClose()
    }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [onClose])

  const shellClass = useMemo(
    () =>
      'fixed inset-0 z-50 bg-[#070a14] text-white ' +
      (open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'),
    [open],
  )

  return (
    <div className={shellClass}>
      <div ref={stageRef} className="h-full w-full">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
            <div className="text-sm font-semibold text-white">{title}</div>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (document.fullscreenElement) await document.exitFullscreen()
                } finally {
                  onClose()
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              <X className="h-4 w-4" /> 關閉
            </button>
          </div>
          <div className="min-h-0 flex-1 p-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
