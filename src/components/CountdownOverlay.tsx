import { useEffect, useState } from 'react'
import { Sound } from '../lib/sound'

type Props = {
  active: boolean
  onComplete: () => void
  onCancel?: () => void
}

export default function CountdownOverlay({ active, onComplete, onCancel }: Props) {
  const [count, setCount] = useState(3)
  const [showGo, setShowGo] = useState(false)

  useEffect(() => {
    if (!active) {
      setCount(3)
      setShowGo(false)
      return
    }

    let step = 3
    setCount(3)
    setShowGo(false)

    Sound.countdown3()

    const t1 = setTimeout(() => {
      step = 2
      setCount(2)
      Sound.countdown2()
    }, 800)

    const t2 = setTimeout(() => {
      step = 1
      setCount(1)
      Sound.countdown1()
    }, 1600)

    const t3 = setTimeout(() => {
      setShowGo(true)
      Sound.go()
    }, 2400)

    const t4 = setTimeout(() => {
      onComplete()
      setShowGo(false)
      setCount(3)
    }, 3200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [active, onComplete])

  if (!active && !showGo) return null

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm"
      onClick={() => onCancel?.()}
    >
      {!showGo ? (
        <div
          key={count}
          className="animate-bounce text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(99,102,241,0.5)] sm:text-[10rem]"
          style={{ animationDuration: '0.6s' }}
        >
          {count}
        </div>
      ) : (
        <div
          key="go"
          className="scale-110 text-7xl font-black text-emerald-300 drop-shadow-[0_0_40px_rgba(52,211,153,0.6)] transition-all duration-300 sm:text-9xl"
        >
          GO!
        </div>
      )}
    </div>
  )
}
