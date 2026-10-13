// Responsabilidade única: gerenciar a conexão Web Bluetooth BLE com impressoras térmicas ESC/POS e enviar dados em blocos (chunks).
import { buildRunnerEscPosReceipt, buildTestEscPosReceipt } from './escpos.service.js'

// UUIDs de serviços comuns em mini impressoras térmicas Bluetooth (ESC/POS)
const COMMON_THERMAL_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb'
]

const CHUNK_SIZE = 80 // Tamanho máximo do bloco BLE em bytes
const CHUNK_DELAY_MS = 25 // Pequeno intervalo para o buffer da impressora não estourar

let activeDevice = null
let activeServer = null
let writeCharacteristic = null
let statusListeners = new Set()

/**
 * Verifica se o navegador atual tem suporte à Web Bluetooth API.
 * @returns {boolean}
 */
export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth)
}

/**
 * Retorna o status atual da impressora térmica.
 * @returns {{ connected: boolean, deviceName: string|null }}
 */
export function getPrinterStatus() {
  const isConnected = Boolean(activeDevice && activeDevice.gatt && activeDevice.gatt.connected && writeCharacteristic)
  return {
    connected: isConnected,
    deviceName: isConnected ? (activeDevice.name || 'Impressora Térmica') : null
  }
}

/**
 * Registra um ouvinte para alterações no status de conexão da impressora.
 * @param {(status: { connected: boolean, deviceName: string|null }) => void} callback
 * @returns {() => void} Função para cancelar a inscrição.
 */
export function subscribePrinterStatus(callback) {
  statusListeners.add(callback)
  callback(getPrinterStatus())
  return () => statusListeners.delete(callback)
}

function notifyStatusChange() {
  const current = getPrinterStatus()
  for (const listener of statusListeners) {
    try { listener(current) } catch (e) { console.error(e) }
  }
}

/**
 * Abre o diálogo do navegador para selecionar e conectar à impressora Bluetooth BLE.
 * @returns {Promise<{ connected: boolean, deviceName: string }>}
 */
export async function connectBluetoothPrinter() {
  if (!isBluetoothSupported()) {
    throw new Error('BLUETOOTH_NOT_SUPPORTED')
  }

  // 1. Solicita dispositivo ao usuário
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: COMMON_THERMAL_SERVICES
  })

  // 2. Conecta ao GATT Server
  const server = await device.gatt.connect()

  // 3. Descobre characteristic com capacidade de escrita
  let foundChar = null
  for (const serviceUuid of COMMON_THERMAL_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid)
      const characteristics = await service.getCharacteristics()
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          foundChar = char
          break
        }
      }
      if (foundChar) break
    } catch (e) {
      // Serviço não presente nesta impressora, continua tentando os outros
    }
  }

  // Se não encontrou pelos UUIDs conhecidos, tenta buscar todos os serviços primários
  if (!foundChar) {
    try {
      const services = await server.getPrimaryServices()
      for (const service of services) {
        const characteristics = await service.getCharacteristics()
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            foundChar = char
            break
          }
        }
        if (foundChar) break
      }
    } catch (e) {
      console.warn('Falha ao listar serviços genéricos:', e)
    }
  }

  if (!foundChar) {
    throw new Error('NO_WRITE_CHARACTERISTIC_FOUND')
  }

  activeDevice = device
  activeServer = server
  writeCharacteristic = foundChar

  // Ouvir desconexão automática (impressora desligada ou fora de alcance)
  device.addEventListener('gattserverdisconnected', () => {
    activeDevice = null
    activeServer = null
    writeCharacteristic = null
    notifyStatusChange()
  })

  notifyStatusChange()
  return { connected: true, deviceName: device.name || 'Impressora Térmica' }
}

/**
 * Desconecta da impressora Bluetooth atual.
 */
export function disconnectBluetoothPrinter() {
  if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected) {
    activeDevice.gatt.disconnect()
  }
  activeDevice = null
  activeServer = null
  writeCharacteristic = null
  notifyStatusChange()
}

/**
 * Envia um buffer de bytes para a impressora em fatias seguras (chunks) via BLE.
 * @param {Uint8Array} data
 */
async function sendDataInChunks(data) {
  if (!writeCharacteristic) {
    throw new Error('PRINTER_NOT_CONNECTED')
  }

  const length = data.length
  for (let i = 0; i < length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE)
    if (writeCharacteristic.properties.writeWithoutResponse) {
      await writeCharacteristic.writeValueWithoutResponse(chunk)
    } else {
      await writeCharacteristic.writeValue(chunk)
    }
    if (CHUNK_DELAY_MS > 0 && (i + CHUNK_SIZE) < length) {
      await new Promise(res => setTimeout(res, CHUNK_DELAY_MS))
    }
  }
}

/**
 * Imprime o cupom do corredor diretamente na impressora térmica Bluetooth conectada.
 * Se a impressora ainda não estiver conectada, solicita conexão primeiro.
 * @param {string} qrDataUrl - Data URL do QR Code.
 * @param {{ id: string, name: string, number?: string }} runner - Dados do corredor.
 * @param {string} [raceName] - Nome da corrida.
 * @returns {Promise<boolean>}
 */
export async function printRunnerToBluetooth(qrDataUrl, runner, raceName) {
  if (!getPrinterStatus().connected) {
    await connectBluetoothPrinter()
  }

  const receiptBytes = await buildRunnerEscPosReceipt(qrDataUrl, runner)
  await sendDataInChunks(receiptBytes)
  return true
}

/**
 * Imprime um cupom de teste na impressora térmica para validar o pareamento.
 * @returns {Promise<boolean>}
 */
export async function printTestToBluetooth() {
  if (!getPrinterStatus().connected) {
    await connectBluetoothPrinter()
  }

  const printerName = getPrinterStatus().deviceName || 'Impressora Térmica'
  const testBytes = buildTestEscPosReceipt(printerName)
  await sendDataInChunks(testBytes)
  return true
}
