import { useEffect, useState } from 'react'

export function useObjectUrl(blobOrFile: Blob | File | null | undefined) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blobOrFile) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blobOrFile)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blobOrFile])

  return url
}
