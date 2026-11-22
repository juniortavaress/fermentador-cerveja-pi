#include "comms.h"
#include "config.h"

#if COMMS_TRANSPORT == COMMS_BLE

// Bluetooth LE com o serviço Nordic UART (uma "serial por Bluetooth"), espelhado na USB.
// Tudo que sai vai para os dois; comandos chegam de qualquer um. Precisa do core "esp32" (Espressif).
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define BLE_NAME   "Fermentador"
#define NUS_SERVICE "6e400001-b5a3-f393-a6e3-43dcd7a8d9ae"
#define NUS_RX      "6e400002-b5a3-f393-a6e3-43dcd7a8d9ae"  // app -> placa
#define NUS_TX      "6e400003-b5a3-f393-a6e3-43dcd7a8d9ae"  // placa -> app

static BLECharacteristic *txChar = nullptr;
static volatile bool bleConnected = false;

// ---------- Entrada: fila de bytes (o BLE entrega em outra tarefa) ----------
static const size_t RX_SIZE = 256;
static volatile uint8_t rxQueue[RX_SIZE];
static volatile size_t rxHead = 0, rxTail = 0;

static void rxPush(uint8_t c) {
  size_t next = (rxHead + 1) % RX_SIZE;
  if (next == rxTail) return;  // cheia: descarta
  rxQueue[rxHead] = c;
  rxHead = next;
}

static int rxPop() {
  if (rxTail == rxHead) return -1;
  uint8_t c = rxQueue[rxTail];
  rxTail = (rxTail + 1) % RX_SIZE;
  return c;
}

class RxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *ch) override {
    const uint8_t *data = ch->getData();
    size_t len = ch->getLength();
    for (size_t i = 0; i < len; i++) rxPush(data[i]);
  }
};

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *) override { bleConnected = true; }
  void onDisconnect(BLEServer *) override {
    bleConnected = false;
    BLEDevice::startAdvertising();  // volta a aparecer para o próximo pareamento
  }
};

// ---------- Saída: USB na hora, Bluetooth por linha (em pedaços de 20 bytes) ----------
class DualOut : public Print {
  uint8_t line[160];
  size_t len = 0;

  void flushBle() {
    if (bleConnected && txChar && len > 0) {
      for (size_t i = 0; i < len; i += 20) {
        txChar->setValue(line + i, min((size_t)20, len - i));
        txChar->notify();
        delay(4);  // dá tempo da pilha BLE esvaziar a fila
      }
    }
    len = 0;
  }

 public:
  size_t write(uint8_t c) override {
    Serial.write(c);
    if (len < sizeof(line)) line[len++] = c;
    if (c == '\n') flushBle();
    return 1;
  }
};

static DualOut out;

// ---------- Interface comms.h ----------
static char   lineBuf[48];
static size_t lineLen = 0;

void commsBegin() {
  Serial.begin(SERIAL_BAUD);

  BLEDevice::init(BLE_NAME);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(NUS_SERVICE);
  txChar = service->createCharacteristic(NUS_TX, BLECharacteristic::PROPERTY_NOTIFY);
  txChar->addDescriptor(new BLE2902());
  BLECharacteristic *rxChar = service->createCharacteristic(
      NUS_RX, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  rxChar->setCallbacks(new RxCallbacks());
  service->start();

  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(NUS_SERVICE);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}

bool commsReadLine(char *buf, size_t size) {
  // Comandos pela USB entram na mesma fila que os do Bluetooth.
  while (Serial.available()) rxPush((uint8_t)Serial.read());

  int c;
  while ((c = rxPop()) >= 0) {
    if (c == '\r') continue;
    if (c == '\n') {
      lineBuf[lineLen] = '\0';
      strncpy(buf, lineBuf, size - 1);
      buf[size - 1] = '\0';
      lineLen = 0;
      return true;
    }
    if (lineLen < sizeof(lineBuf) - 1) lineBuf[lineLen++] = (char)c;
  }
  return false;
}

Print &commsOut() { return out; }

#endif
