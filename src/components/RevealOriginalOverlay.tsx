type Props = {
  src: string | null
  revealed: boolean
}

export default function RevealOriginalOverlay({ src, revealed }: Props) {
  if (!revealed || !src) return null
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/75 p-4">
      <img src={src} alt="answer" draggable={false} className="max-h-full max-w-full object-contain" />
    </div>
  )
}
