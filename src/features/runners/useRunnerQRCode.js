// Responsabilidade única: hook para gerar (e cachear) o data URL do QR code de um corredor sob demanda.
import { useCallback, useState } from 'react'
import { generateRunnerQRCode } from './qrcode.service.js'
import { composeQRWithLabel } from './qr-label.service.js'

/** @param {import('./runners.types.js').Runner} runner */
export function useRunnerQRCode(runner) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  const ensureQRCode = useCallback(async () => {
    if (qrDataUrl) return qrDataUrl
    setLoading(true)
    try {
      const rawQrDataUrl = await generateRunnerQRCode(runner)
      const labeledQrDataUrl = await composeQRWithLabel(rawQrDataUrl, runner.name)
      setQrDataUrl(labeledQrDataUrl)
      return labeledQrDataUrl
    } finally {
      setLoading(false)
    }
  }, [runner, qrDataUrl])

  return { qrDataUrl, loading, ensureQRCode }
}

