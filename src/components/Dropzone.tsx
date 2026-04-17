import { useCallback, useMemo, useState } from 'react'
import { ImageUp, Sparkles, X } from 'lucide-react'

type Props = {
  onFiles: (files: File[]) => void
  fileName?: string | null
  count?: number
  hint?: string
}

export default function Dropzone({ onFiles, fileName, count, hint }: Props) {
  const [dragOver, setDragOver] = useState(false)

  const accept = useMemo(() => 'image/*', [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const list = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith('image/'))
      if (list.length) onFiles(list)
    },
    [onFiles],
  )

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragOver(false)
      }}
      onDrop={onDrop}
      className={
        'relative rounded-2xl border border-white/10 bg-white/5 p-5 transition ' +
        (dragOver ? 'ring-2 ring-indigo-400/60' : 'hover:bg-white/7')
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/15 text-indigo-200">
            <ImageUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {fileName ? (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-300" /> {fileName}
                  {typeof count === 'number' && count > 1 ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                      +{count - 1}
                    </span>
                  ) : null}
                </span>
              ) : (
                '上傳圖片'
              )}
            </div>
            <div className="text-xs text-white/65">
              {hint ?? '拖曳圖片到這裡，或點擊選擇檔案（支援 PNG / JPG / WEBP）'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {fileName ? (
            <button
              type="button"
              onClick={() => onFiles([])}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              title="清除"
            >
              <X className="h-4 w-4" /> 清除
            </button>
          ) : null}

          <label className="cursor-pointer rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-400">
            選擇檔案
            <input
              className="hidden"
              type="file"
              accept={accept}
              multiple
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
                if (list.length) onFiles(list)
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
      </div>

      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-indigo-500/10" />
      ) : null}
    </div>
  )
}
