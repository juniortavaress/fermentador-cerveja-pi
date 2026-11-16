import { SerialTransport } from "./serial.js"
import { SimulatorTransport } from "./simulator.js"

export { isSerialSupported } from "./serial.js"

/**
 * Único ponto que decide qual transporte usar.
 *
 * Para trocar o Arduino pelo ESP: crie src/transport/websocket.js com a mesma interface do
 * SerialTransport (connect, disconnect, send, onLine, onStatus) e use-o aqui no modo "live".
 * O app, o motor de etapas e o protocolo continuam iguais.
 */
export function createTransport(mode) {
  return mode === "dev" ? new SimulatorTransport() : new SerialTransport()
}
