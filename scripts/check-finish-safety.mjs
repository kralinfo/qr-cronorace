import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function extractBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken)
  if (start < 0) return ''
  const end = source.indexOf(endToken, start)
  if (end < 0) return source.slice(start)
  return source.slice(start, end)
}

const filePath = resolve(process.cwd(), 'public/chronometer.html')
const source = readFileSync(filePath, 'utf8')

const confirmFinishBlock = extractBetween(source, 'async function confirmFinish()', 'function showRankingView')
const resetTimerBlock = extractBetween(source, 'async function resetTimer()', 'async function confirmFinish()')
const applyStateBlock = extractBetween(source, 'function applyLiveRaceState(race)', 'window.startRaceDocumentListening = function')

assert(confirmFinishBlock.includes('race.endTime=nowIso'), 'confirmFinish deve definir endTime.')
assert(confirmFinishBlock.includes('setRaceEndedMarker('), 'confirmFinish deve salvar marcador de corrida encerrada.')
assert(confirmFinishBlock.includes('patch.startTime = safeStartTime'), 'confirmFinish deve preservar startTime quando necessário.')

assert(!confirmFinishBlock.includes('deleteAllResultsForRace('), 'confirmFinish não pode apagar resultados.')
assert(!confirmFinishBlock.includes('clearArrivalsCache('), 'confirmFinish não pode limpar cache de chegadas.')
assert(!confirmFinishBlock.includes('clearActiveRace'), 'confirmFinish não pode limpar corrida ativa.')

assert(resetTimerBlock.includes('deleteAllResultsForRace('), 'resetTimer deve continuar sendo o único caminho que limpa resultados.')

const endedCaseIndex = applyStateBlock.indexOf('if (race.endTime)')
const resetCaseIndex = applyStateBlock.indexOf('if (!race.startTime)')
assert(endedCaseIndex >= 0 && resetCaseIndex >= 0 && endedCaseIndex < resetCaseIndex,
  'applyLiveRaceState deve tratar corrida encerrada antes do caso sem startTime.')

console.log('✓ Regressão validada: encerrar corrida não apaga corredores nem classificação.')
