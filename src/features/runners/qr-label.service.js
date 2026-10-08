// Responsabilidade única: compor uma imagem combinando o QR code com um rótulo textual (nome do corredor).

/**
 * Desenha o QR code original em um canvas e adiciona o nome do corredor como legenda abaixo,
 * retornando um novo data URL pronto para impressão/download.
 * @param {string} qrDataUrl - Data URL do QR code puro.
 * @param {string} label - Texto a ser exibido abaixo do QR (ex: nome do corredor).
 * @returns {Promise<string>}
 */
export function composeQRWithLabel(qrDataUrl, label) {
  const LABEL_HEIGHT = 36
  const FONT = '20px system-ui, sans-serif'

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height + LABEL_HEIGHT

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)

      ctx.fillStyle = '#000000'
      ctx.font = FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, canvas.width / 2, image.height + LABEL_HEIGHT / 2, canvas.width - 10)

      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = reject
    image.src = qrDataUrl
  })
}
