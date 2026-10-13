// Responsabilidade única: compor uma imagem combinando o QR code com um rótulo textual (nome do corredor).

/**
 * Desenha o QR code original em um canvas e adiciona o nome do corredor e número como legenda abaixo,
 * retornando um novo data URL pronto para visualização, impressão e download.
 * @param {string} qrDataUrl - Data URL do QR code puro.
 * @param {string} label - Texto a ser exibido abaixo do QR (nome do corredor).
 * @param {string|null} [subLabel] - Texto adicional abaixo do nome (ex: "Nº 0008").
 * @returns {Promise<string>}
 */
export function composeQRWithLabel(qrDataUrl, label, subLabel) {
  const hasSub = Boolean(subLabel)
  const LABEL_HEIGHT = hasSub ? 54 : 36

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
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      if (hasSub) {
        ctx.font = 'bold 18px system-ui, sans-serif'
        ctx.fillText(label, canvas.width / 2, image.height + 18, canvas.width - 12)

        ctx.font = '600 16px system-ui, sans-serif'
        ctx.fillStyle = '#222222'
        ctx.fillText(subLabel, canvas.width / 2, image.height + 38, canvas.width - 12)
      } else {
        ctx.font = 'bold 18px system-ui, sans-serif'
        ctx.fillText(label, canvas.width / 2, image.height + LABEL_HEIGHT / 2, canvas.width - 10)
      }

      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = reject
    image.src = qrDataUrl
  })
}
