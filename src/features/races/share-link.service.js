// Responsabilidade única: construir o link público de cadastro para compartilhar com outra pessoa.

/** @returns {string} link que abre a tela de cadastro público (fora do fluxo do organizador) */
export function buildRegistrationLink() {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('cadastro', '1')
  return url.toString()
}
