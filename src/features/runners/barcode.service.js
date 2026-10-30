// Responsabilidade única: codificar/decodificar o payload gravado no código de barras do corredor e gerar sua imagem.
import JsBarcodeModule from 'jsbarcode'

const JsBarcode = (typeof JsBarcodeModule === 'function')
  ? JsBarcodeModule
  : (JsBarcodeModule?.default || JsBarcodeModule)

/**
 * Rotaciona um canvas HTML em 90 graus no sentido horário.
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {HTMLCanvasElement}
 */
export function rotateCanvas90(sourceCanvas) {
  const rotated = document.createElement('canvas')
  rotated.width = sourceCanvas.height
  rotated.height = sourceCanvas.width
  const ctx = rotated.getContext('2d')
  if (!ctx) return sourceCanvas
  ctx.translate(rotated.width / 2, rotated.height / 2)
  ctx.rotate((90 * Math.PI) / 180)
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2)
  return rotated
}

/** @param {import('./runners.types.js').Runner} runner @returns {string} */
export function encodeRunnerPayload(runner) {
  // Leitores de código de barras (wedge de teclado) leem texto simples.
  // Gravamos o número de peito do corredor (ex: "0010") para que o cronômetro
  // identifique o corredor pelo número ao ler o barcode - igual ao que o operador digita manualmente.
  const num = String(runner.number || runner.id).replace(/\D/g, '') || String(runner.id)
  return num
}

/**
 * Gera apenas o código de barras Code 128 puro.
 * @param {import('./runners.types.js').Runner} runner
 * @param {{ rotated?: boolean, width?: number, height?: number }} [options]
 * @returns {Promise<string>}
 */
export async function generateRunnerBarcode(runner, options = {}) {
  const { rotated = false, width = 3, height = 100 } = options
  const payload = encodeRunnerPayload(runner)
  const canvas = document.createElement('canvas')

  JsBarcode(canvas, payload, {
    format: 'CODE128',
    width: rotated ? Math.max(width, 3.5) : width,
    height: rotated ? Math.max(height, 120) : height,
    displayValue: true,
    margin: 6,
    background: '#ffffff',
    lineColor: '#000000',
    fontSize: 20
  })

  if (!rotated) {
    return canvas.toDataURL('image/png')
  }

  const rotatedCanvas = rotateCanvas90(canvas)
  return rotatedCanvas.toDataURL('image/png')
}

/**
 * Gera a ETIQUETA ADESIVA COMPLETA do corredor para o tamanho ampliado do adesivo térmico (~8.8 cm).
 * - TODAS AS INFORMAÇÕES (Número, Nome, Categoria e Código de Barras) ficam 100% no mesmo sentido horizontal.
 * - MÁXIMA ÊNFASE AO NOME DO ATLETA (fonte gigante de até 40px em negrito).
 * - Categoria/sexo secundária e discreta no cantinho superior.
 * - CÓDIGO DE BARRAS BEM GRANDE: barras grossas (width: 5 a 6), altura de ~165px, preenchendo a maior parte da etiqueta!
 * - Comprimento ampliado para ~8.8 cm (700 dots) para cobrir toda a extensão do adesivo e cortar exatamente no picote.
 *
 * @param {import('./runners.types.js').Runner} runner
 * @param {{ rotatedForThermal?: boolean }} [options]
 * @returns {Promise<string>} Data URL da imagem da etiqueta
 */
export async function generateRunnerThermalLabel(runner, options = {}) {
  const { rotatedForThermal = false } = options
  const canvas = document.createElement('canvas')
  // Comprimento aumentado para ~8.8 cm (700 pixels em 203 DPI)
  // Largura útil da bobina de 58mm = 380 pixels
  const width = 700
  const height = 360
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // 1. Fundo branco
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // 2. Linha superior: Número de peito grande e Categoria/Sexo discreta
  ctx.textBaseline = 'top'

  if (runner?.number) {
    ctx.font = '900 36px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'left'
    ctx.fillText(`Nº ${runner.number}`, 16, 12)
  }

  if (runner?.category) {
    // Sexo/categoria discreto e secundário no canto superior
    ctx.font = '700 16px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#555555'
    ctx.textAlign = 'right'
    ctx.fillText(String(runner.category).slice(0, 24), width - 16, 22)
  }

  // Linha divisória
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(16, 54)
  ctx.lineTo(width - 16, 54)
  ctx.stroke()

  // 3. DESTAQUE PRINCIPAL: NOME DO CORREDOR (MÁXIMA ÊNFASE VISUAL)
  const rawName = String(runner?.name || 'Corredor').trim()
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'

  // Ajusta dinamicamente a fonte para dar o maior destaque possível sem quebrar
  let nameFontSize = 40
  if (rawName.length > 28) {
    nameFontSize = 26
  } else if (rawName.length > 20) {
    nameFontSize = 32
  }
  ctx.font = `900 ${nameFontSize}px system-ui, -apple-system, sans-serif`
  ctx.fillText(rawName, width / 2, 64)

  // 4. CÓDIGO DE BARRAS BEM GRANDE E ROBUSTO
  const barcodeCanvas = document.createElement('canvas')
  const payload = encodeRunnerPayload(runner)

  // Calibra a espessura das barras para números curtos (ex: 4 dígitos) ocuparem quase toda a largura
  let barModuleWidth = 5.2
  if (payload.length <= 3) {
    barModuleWidth = 6.8
  } else if (payload.length <= 5) {
    barModuleWidth = 5.8
  }

  JsBarcode(barcodeCanvas, payload, {
    format: 'CODE128',
    width: barModuleWidth, // Barras bem grossas para ficar largo
    height: 160,          // Altura bem maior das barras para leitura instantânea
    displayValue: true,
    margin: 4,
    background: '#ffffff',
    lineColor: '#000000',
    fontSize: 24          // Dígitos do barcode grandes e visíveis
  })

  // Desenha o código de barras centralizado ocupando generosamente a base da etiqueta
  const rawBcWidth = barcodeCanvas.width
  const targetBcWidth = Math.min(width - 32, Math.max(rawBcWidth, 500))
  const targetBcHeight = 195
  const bcX = Math.floor((width - targetBcWidth) / 2)
  const bcY = height - targetBcHeight - 10

  ctx.drawImage(barcodeCanvas, bcX, bcY, targetBcWidth, targetBcHeight)

  // Se for para a impressora térmica, rotaciona a etiqueta 90°
  // para que ela corra ao longo dos ~8.8 cm de saída do papel!
  if (rotatedForThermal) {
    const rotated = rotateCanvas90(canvas)
    return rotated.toDataURL('image/png')
  }

  return canvas.toDataURL('image/png')
}

/**
 * Decodifica o texto lido do código de barras de volta para os dados do corredor.
 * Aceita tanto o formato JSON `{id,name,raceId}` (QRs antigos) quanto texto simples (tratado como id).
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
