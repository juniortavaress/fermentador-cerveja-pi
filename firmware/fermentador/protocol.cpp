#include <stdlib.h>
#include <ctype.h>
#include "protocol.h"
#include "config.h"

static bool parseNumber(const char *s, float &out) {
  while (*s == ' ') s++;
  if (!*s) return false;
  char *end;
  out = strtod(s, &end);
  while (*end == ' ') end++;
  return *end == '\0';
}

Command protocolParse(const char *line) {
  Command cmd = { CMD_NONE, 0 };
  while (*line == ' ') line++;
  if (!*line) return cmd;

  char up[48];
  size_t i = 0;
  for (; line[i] && i < sizeof(up) - 1; i++) up[i] = toupper(line[i]);
  up[i] = '\0';

  float v;
  if (up[0] == '?' && up[1] == '\0') {
    cmd.type = CMD_GET_CONFIG;
  } else if (up[0] == 'S' && up[1] == 'P') {
    if (parseNumber(up + 2, v) && v >= SP_MIN && v <= SP_MAX) { cmd.type = CMD_SET_SP; cmd.value = v; }
    else cmd.type = CMD_INVALID;
  } else if (up[0] == 'M' && up[1] == 'C') {
    if (parseNumber(up + 2, v) && v >= 0 && v <= MINCYCLE_MAX_MIN) { cmd.type = CMD_SET_MINCYCLE; cmd.value = v; }
    else cmd.type = CMD_INVALID;
  } else if (up[0] == 'R' && up[1] == 'U' && up[2] == 'N') {
    if (parseNumber(up + 3, v) && (v == 0 || v == 1)) { cmd.type = CMD_SET_RUN; cmd.value = v; }
    else cmd.type = CMD_INVALID;
  } else if (up[0] == 'H') {
    if (parseNumber(up + 1, v) && v >= HYST_MIN && v <= HYST_MAX) { cmd.type = CMD_SET_HYST; cmd.value = v; }
    else cmd.type = CMD_INVALID;
  } else {
    cmd.type = CMD_INVALID;
  }
  return cmd;
}

void protocolWriteTelemetry(Print &out, const Telemetry &t) {
  out.print(F("SP:"));       out.print(t.setPoint, 1);
  out.print(F(",Tcaixa:"));  out.print(t.tChamber, 1);
  out.print(F(",Tamb:"));
  if (isnan(t.tAmbient)) out.print(F("0")); else out.print(t.tAmbient, 1);
  out.print(F(",Aquec:"));   out.print(t.heating ? 1 : 0);
  out.print(F(",Frio:"));    out.print(t.cooling ? 1 : 0);
  out.print(F(",Rntc_k:"));  out.print(t.rNtcK, 1);
  out.print(F(",On:"));      out.println(t.enabled ? 1 : 0);
}

void protocolWriteConfig(Print &out, const ControlConfig &cfg) {
  out.print(F("# Set point: "));    out.print(cfg.setPoint, 1);
  out.print(F(" C | Histerese: ")); out.print(cfg.hysteresis, 1);
  out.print(F(" C | Ciclo min: ")); out.print(cfg.minCycleMs / 60000.0, 1);
  out.println(F(" min"));
}

void protocolWriteError(Print &out) {
  out.println(F("# Comando invalido. Use: SP 18.5 | H 0.5 | MC 3 | RUN 1 | ?"));
}
