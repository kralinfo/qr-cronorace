// Responsabilidade única: codificar/decodificar o payload gravado no QR code do corredor.
import QRCode from 'qrcode'

/**
 * Gera a imagem (data URL) do QR code representando o corredor.
 * @param {import('./runners.types.js').Runner} runner
 * @returns {Promise<string>}
 */
export function generateRunnerQRCode(runner) {
  const payload = encodeRunnerPayload(runner)
  return QRCode.toDataURL(payload, { errorCorrectionLevel: 'Q', margin: 2, scale: 6 })
}

/** @param {import('./runners.types.js').Runner} runner @returns {string} */
export function encodeRunnerPayload(runner) {
  return JSON.stringify({ id: runner.id, number: runner.number ?? null, name: runner.name, raceId: runner.raceId })
}

/**
 * Decodifica o texto lido do QR code de volta para os dados do corredor.
 * Aceita tanto o formato JSON `{id,name,raceId}` quanto texto simples (tratado como id).
 * @param {string} text
 * @returns {{ id: string, number: string|null, name: string|null, raceId: string|null }}
 */
export function decodeRunnerPayload(text) {
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object' && parsed.id) {
      return {
        id: String(parsed.id),
        number: parsed.number ? String(parsed.number) : null,
        name: parsed.name ? String(parsed.name) : null,
        raceId: parsed.raceId ? String(parsed.raceId) : null
      }
    }
  } catch (e) {
    /* não é JSON, trata como texto simples */
  }
  return { id: text.trim(), number: null, name: null, raceId: null }
}
