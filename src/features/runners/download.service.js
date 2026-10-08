// Responsabilidade única: disparar o download de um data URL como arquivo no navegador.

/**
 * Dispara o download de um data URL (ex.: imagem de QR code) como arquivo.
 * @param {string} dataUrl
 * @param {string} filename
 */
export function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
