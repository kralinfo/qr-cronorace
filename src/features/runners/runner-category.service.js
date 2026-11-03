// Responsabilidade única: interpretar e montar a string de categoria do corredor
// (sexo + local/visitante + condição especial), usada no cadastro e na edição.

/** @typedef {'MASCULINO'|'FEMININO'} RunnerGender */
/** @typedef {''|'PCD'|'+50'|'45-49'} RunnerSpecialCondition */
/** @typedef {{ gender: RunnerGender, isLocal: boolean, special: RunnerSpecialCondition }} CategoryParts */

/**
 * Extrai sexo, origem (local/visitante) e condição especial de uma string de categoria
 * já salva (ex: "LOCAL FEM | PCD", "MASCULINO", "FEMININO | +50").
 * @param {string} [category]
 * @returns {CategoryParts}
 */
export function parseCategory(category) {
  const normalized = (category || '').toUpperCase()
  const gender = normalized.includes('FEM') ? 'FEMININO' : 'MASCULINO'
  const isLocal = normalized.includes('LOCAL')

  let special = ''
  if (normalized.includes('PCD')) {
    special = 'PCD'
  } else if (normalized.includes('45-49') || normalized.includes('45 A 49')) {
    special = '45-49'
  } else if (normalized.includes('+50') || normalized.includes('50')) {
    special = '+50'
  }

  return { gender, isLocal, special }
}

/**
 * Monta a string de categoria a partir das partes (sexo, local/visitante, condição especial),
 * no mesmo formato já usado em todo o app para filtros e exibição (AllRunnersModal, ResultsPage etc.).
 * @param {CategoryParts} parts
 * @returns {string}
 */
export function buildCategory({ gender, isLocal, special }) {
  const base = isLocal
    ? (gender === 'FEMININO' ? 'LOCAL FEM' : 'LOCAL MASC')
    : (gender === 'FEMININO' ? 'FEMININO' : 'MASCULINO')
  return special ? `${base} | ${special}` : base
}
