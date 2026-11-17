import { SEED_VERSION } from "./defaults.js"

// Receitas longas (em horas) usadas pelos testes do motor de etapas.
// O app só traz o exemplo curto de demonstração; estas existem só para testar o relógio com horas.
export const LONG_BATCHES = [
  {
    id: "exemplo-ipa",
    name: "Exemplo · American IPA",
    style: "American IPA",
    yeast: "Levedura Ale",
    stages: [
      { name: "Lag", durationHours: 12, temp: 20 },
      { name: "Primária", durationHours: 72, temp: 18.5 },
      { name: "Secundária", durationHours: 48, temp: 17 },
      { name: "Maturação", durationHours: 96, temp: 4 },
    ],
  },
  {
    id: "exemplo-pilsen",
    name: "Exemplo · Pilsen",
    style: "Pilsen",
    yeast: "Levedura Lager",
    stages: [
      { name: "Inoculação", durationHours: 18, temp: 12 },
      { name: "Fermentação", durationHours: 120, temp: 11 },
      { name: "Descanso", durationHours: 36, temp: 16 },
      { name: "Maturação", durationHours: 168, temp: 3 },
    ],
  },
]

/** Põe as receitas longas no localStorage e marca a lista de exemplos como já migrada. */
export function seedLongBatches() {
  localStorage.setItem("fermentador.batches", JSON.stringify(LONG_BATCHES))
  localStorage.setItem("fermentador.selected", JSON.stringify(LONG_BATCHES[0].id))
  localStorage.setItem("fermentador.seed", SEED_VERSION)
}
