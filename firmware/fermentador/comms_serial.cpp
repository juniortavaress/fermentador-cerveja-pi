#include "comms.h"
#include "config.h"

#if COMMS_TRANSPORT == COMMS_SERIAL

static char   lineBuf[48];
static size_t lineLen = 0;

void commsBegin() {
  Serial.begin(SERIAL_BAUD);
}

bool commsReadLine(char *buf, size_t size) {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      lineBuf[lineLen] = '\0';
      strncpy(buf, lineBuf, size - 1);
      buf[size - 1] = '\0';
      lineLen = 0;
      return true;
    }
    if (lineLen < sizeof(lineBuf) - 1) lineBuf[lineLen++] = c;
  }
  return false;
}

Print &commsOut() { return Serial; }

#endif
