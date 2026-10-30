// Responsabilidade única: gerar comandos ESC/POS e converter imagens (Barcode / Etiqueta) em bitmaps monocromáticos para impressoras térmicas (58mm/80mm).
import { generateRunnerThermalLabel } from './barcode.service.js'

/**
 * Normaliza textos removendo acentos para evitar caracteres corrompidos em impressoras térmicas ESC/POS.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeTextForThermal(text) {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, '')
}

/**
 * Converte uma imagem (dataURL ou Image) em bytes ESC/POS raster bit image (GS v 0).
 * Compatível com 100% das impressoras térmicas de cupom e etiquetas 58mm e 80mm.
 * @param {string} dataUrl - Data URL da imagem.
 * @param {number} [targetWidth=380] - Largura alvo em pixels (múltiplo de 8).
 * @returns {Promise<Uint8Array>}
 */
export function convertImageToEscPosBitmap(dataUrl, targetWidth = 380) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        // Largura em pixels ajustada para múltiplo de 8
        const width = Math.floor(targetWidth / 8) * 8
        const scale = width / img.width
        const height = Math.floor(img.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('Falha ao obter contexto 2D do canvas')

        // Fundo branco
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const imgData = ctx.getImageData(0, 0, width, height)
        const pixels = imgData.data

        const widthBytes = width / 8
        // Comando GS v 0 0 xL xH yL yH (8 bytes de cabeçalho + dados)
        const headerLength = 8
        const totalLength = headerLength + (widthBytes * height)
        const buffer = new Uint8Array(totalLength)

        // GS v 0 m xL xH yL yH
        buffer[0] = 0x1D
        buffer[1] = 0x76
        buffer[2] = 0x30
        buffer[3] = 0x00 // m = 0 (modo normal)
        buffer[4] = widthBytes & 0xFF
        buffer[5] = (widthBytes >> 8) & 0xFF
        buffer[6] = height & 0xFF
        buffer[7] = (height >> 8) & 0xFF

        let offset = headerLength
        for (let y = 0; y < height; y++) {
          for (let byteX = 0; byteX < widthBytes; byteX++) {
            let byteVal = 0
            for (let bit = 0; bit < 8; bit++) {
              const x = (byteX * 8) + bit
              const idx = (y * width + x) * 4
              // Luminância (preto = 1, branco = 0)
              const r = pixels[idx]
              const g = pixels[idx + 1]
              const b = pixels[idx + 2]
              const a = pixels[idx + 3]
              const isDark = a > 128 && (0.299 * r + 0.587 * g + 0.114 * b) < 160
              if (isDark) {
                byteVal |= (1 << (7 - bit))
              }
            }
            buffer[offset++] = byteVal
          }
        }

        resolve(buffer)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Erro ao carregar a imagem da etiqueta térmica'))
    img.src = dataUrl
  })
}

/**
 * Converte string ASCII/Sanitizada em Uint8Array.
 * @param {string} str
 * @returns {Uint8Array}
 */
function textToBytes(str) {
  const sanitized = sanitizeTextForThermal(str)
  const bytes = new Uint8Array(sanitized.length)
  for (let i = 0; i < sanitized.length; i++) {
    bytes[i] = sanitized.charCodeAt(i)
  }
  return bytes
}

/**
 * Concatena múltiplos arrays de Uint8Array em um único buffer.
 * @param {Array<Uint8Array>} arrays
 * @returns {Uint8Array}
 */
export function concatByteArrays(arrays) {
  const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

/**
 * Constrói o buffer binário completo ESC/POS para impressão da etiqueta adesiva térmica ampliada (~8.8 cm).
 * - TODAS as informações (Número, Nome destacado, Categoria e Código de Barras) estão 100% no mesmo sentido horizontal.
 * - MÁXIMA ÊNFASE AO NOME DO ATLETA (destaque central gigante).
 * - CÓDIGO DE BARRAS BEM GRANDE E ROBUSTO (ocupando a base com barras grossas e altas).
 * - Comprimento ampliado para ~8.8 cm (700 dots) para que o corte caia perfeitamente no picote do adesivo.
 * @param {string} [qrDataUrl] - Data URL (opcional).
 * @param {{ id: string, name: string, number?: string, category?: string }} runner - Dados do atleta.
 * @param {string} [raceName] - Nome da corrida.
 * @returns {Promise<Uint8Array>}
 */
export async function buildRunnerEscPosReceipt(qrDataUrl, runner, raceName = '') {
  const commands = []

  // 1. Inicializar impressora (ESC @)
  commands.push(new Uint8Array([0x1B, 0x40]))

  // 2. Alinhamento central (ESC a 1)
  commands.push(new Uint8Array([0x1B, 0x61, 0x01]))

  // 3. Gera a etiqueta adesiva completa de ~8.8 cm (700 dots) rotacionada 90° para a fita de 58mm
  const labelDataUrl = runner
    ? await generateRunnerThermalLabel(runner, { rotatedForThermal: true })
    : qrDataUrl

  // Largura de 380 dots (ocupa toda a largura útil do rolo de 58mm)
  const labelBitmapBytes = await convertImageToEscPosBitmap(labelDataUrl, 360)
  commands.push(labelBitmapBytes)

  // 4. Avanco exato de 15 mm (120 dots em 203 DPI) para alcancar a navalha de corte\n  commands.push(new Uint8Array([0x1B, 0x4A, 120]))\n\n  // 5. Corte parcial (GS V 66 0) exatamente no picote do adesivo
  commands.push(new Uint8Array([0x1D, 0x56, 0x42, 0x00]))

  return concatByteArrays(commands)
}

/**
 * Constrói o buffer binário de um cupom de teste para verificar a impressora térmica.
 * @param {string} [printerName]
 * @returns {Uint8Array}
 */
export function buildTestEscPosReceipt(printerName = 'Impressora Termica') {
  const commands = []
  commands.push(new Uint8Array([0x1B, 0x40])) // Reset
  commands.push(new Uint8Array([0x1B, 0x61, 0x01])) // Centro
  commands.push(new Uint8Array([0x1B, 0x21, 0x30, 0x1B, 0x45, 0x01]))
  commands.push(textToBytes('TESTE OK!\n'))
  commands.push(new Uint8Array([0x1B, 0x21, 0x00, 0x1B, 0x45, 0x00]))
  commands.push(textToBytes(`${printerName}\n`))
  commands.push(textToBytes('Bluetooth Conectado\n'))
  commands.push(textToBytes('--------------------------------\n'))
  commands.push(textToBytes(new Date().toLocaleString('pt-BR') + '\n'))
  commands.push(textToBytes('PWA QR Timing\n\n'))
  commands.push(new Uint8Array([0x1D, 0x56, 0x42, 0x00]))
  return concatByteArrays(commands)
}
