import { useSyncExternalStore } from "react"
import { getSimControl, subscribeSimControl } from "../transport/simControl.js"

/** Valores atuais do circuito simulado ({ chamber, ambient, auto }); a tela atualiza quando mudam. */
export function useSimControl() {
  return useSyncExternalStore(subscribeSimControl, getSimControl)
}
