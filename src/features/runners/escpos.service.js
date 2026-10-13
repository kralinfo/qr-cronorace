// Responsabilidade única: gerar comandos ESC/POS e converter imagens (QR code) em bitmaps monocromáticos para impressoras térmicas (58mm/80mm).

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
 * Compatível com 100% das impressoras térmicas de cupom 58mm e 80mm.
 * @param {string} dataUrl - Data URL da imagem do QR Code.
 * @param {number} [targetWidth=256] - Largura alvo em pixels (múltiplo de 8).
 * @returns {Promise<Uint8Array>}
 */
export function convertImageToEscPosBitmap(dataUrl, targetWidth = 256) {
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
    img.onerror = () => reject(new Error('Erro ao carregar a imagem do QR Code'))
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
 * Constrói o buffer binário completo ESC/POS para impressão do cupom térmico do corredor.
 * @param {string} qrDataUrl - Data URL do QR code do corredor.
 * @param {{ id: string, name: string, number?: string }} runner - Dados do atleta.
 * @param {string} [raceName] - Nome da corrida.
 * @returns {Promise<Uint8Array>}
 */
export async function buildRunnerEscPosReceipt(qrDataUrl, runner, raceName) {
  const commands = []

  // 1. Inicializar impressora (ESC @)
  commands.push(new Uint8Array([0x1B, 0x40]))

  // 2. Alinhamento central (ESC a 1)
  commands.push(new Uint8Array([0x1B, 0x61, 0x01]))

  // 3. Nome da corrida (se houver) - Negrito
  if (raceName) {
    commands.push(new Uint8Array([0x1B, 0x45, 0x01])) // Negrito ON
    commands.push(textToBytes(`${raceName}\n`))
    commands.push(new Uint8Array([0x1B, 0x45, 0x00])) // Negrito OFF
  }

  // 4. Nome do atleta - Negrito com altura dupla (ESC ! 0x10)
  commands.push(new Uint8Array([0x1B, 0x21, 0x10, 0x1B, 0x45, 0x01]))
  commands.push(textToBytes(`${runner.name}\n`))
  commands.push(new Uint8Array([0x1B, 0x21, 0x00, 0x1B, 0x45, 0x00]))

  // 5. Número de peito em destaque grande (ESC ! 0x30 - Altura e Largura dupla)
  if (runner.number) {
    commands.push(new Uint8Array([0x1B, 0x21, 0x30, 0x1B, 0x45, 0x01]))
    commands.push(textToBytes(`N. ${runner.number}\n`))
    commands.push(new Uint8Array([0x1B, 0x21, 0x00, 0x1B, 0x45, 0x00]))
  }

  // 6. Espaçamento antes do QR
  commands.push(textToBytes('\n'))

  // 7. QR Code como Bitmap ESC/POS (largura de 256px - ideal para papel de 58mm/80mm)
  const qrBitmapBytes = await convertImageToEscPosBitmap(qrDataUrl, 256)
  commands.push(qrBitmapBytes)

  // 8. Identificador e rodapé
  commands.push(textToBytes(`\nID: ${runner.id}\n`))
  commands.push(textToBytes('--------------------------------\n'))
  commands.push(textToBytes('PWA QR Timing\n'))

  // 9. Avanço de linhas para corte e destaque do papel (ESC d 4 ou quebras de linha)
  commands.push(new Uint8Array([0x1B, 0x64, 0x04]))
  commands.push(textToBytes('\n\n'))

  // 10. Comando de corte parcial de papel (GS V 65 0) - para impressoras com guilhotina
  commands.push(new Uint8Array([0x1D, 0x56, 0x41, 0x00]))

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
  commands.push(textToBytes('PWA QR Timing\n\n\n\n\n'))
  commands.push(new Uint8Array([0x1D, 0x56, 0x41, 0x00]))
  return concatByteArrays(commands)
}
