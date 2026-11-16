#include "controller.h"

void controllerInit(ControlState &state) {
  state.heating = false;
  state.cooling = false;
  state.coolingChangedAt = 0;
  state.coolingEverChanged = false;
}

void controllerUpdate(const ControlConfig &cfg, ControlState &state,
                      float tChamber, float tAmbient, unsigned long nowMs) {
  // ----- Arrefecimento (Peltier) -----
  // Tem muita inércia: não segue a temperatura da caixa. Fica ligado direto quando o
  // set point está abaixo do ambiente e desligado quando está acima.
  // Sem leitura do NTC, desliga por segurança.
  bool wantCooling = state.cooling;
  if (isnan(tAmbient))                               wantCooling = false;
  else if (tAmbient > cfg.setPoint + cfg.hysteresis) wantCooling = true;
  else if (tAmbient <= cfg.setPoint)                 wantCooling = false;

  if (wantCooling != state.cooling) {
    bool canChange = !state.coolingEverChanged ||
                     (nowMs - state.coolingChangedAt >= cfg.minCycleMs);
    // Desligar por falta de sensor nunca espera o tempo mínimo.
    if (isnan(tAmbient)) canChange = true;
    if (canChange) {
      state.cooling = wantCooling;
      state.coolingChangedAt = nowMs;
      state.coolingEverChanged = true;
    }
  }

  // ----- Aquecimento (resistência) -----
  // Faz o controle fino, com o arrefecimento ligado ou não.
  if (tChamber < cfg.setPoint - cfg.hysteresis) state.heating = true;
  else if (tChamber >= cfg.setPoint)            state.heating = false;
}
