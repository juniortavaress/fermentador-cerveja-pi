import { SerialTransport, isSerialSupported } from "./serial.js"
import { BleTransport, isBleSupported } from "./ble.js"
import { SimulatorTransport } from "./simulator.js"

export { isSerialSupported, isBleSupported }

/** Placa real: Bluetooth sempre que o navegador suporta (celular e PC); senão USB. */
export function liveKind() {
  return isBleSupported() ? "ble" : "serial"
}

/** Há alguma forma de falar com a placa neste navegador? */
export function isLiveSupported() {
  return isSerialSupported() || isBleSupported()
}

/**
 * Único ponto que decide qual transporte usar. Todo transporte tem a mesma interface
 * (connect, disconnect, send, onLine, onStatus); o app, o motor de etapas e o protocolo não mudam.
 */
export function createTransport(mode) {
  if (mode === "dev") return new SimulatorTransport()
  return liveKind() === "ble" ? new BleTransport() : new SerialTransport()
}
