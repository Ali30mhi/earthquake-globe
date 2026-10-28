# 📡 Quake Sensor (ESP32 + MPU6050)

A low-cost on-site shaking detector. It sounds a buzzer when it feels strong shaking and streams a live
seismogram to the Live Earthquake Globe over your local Wi-Fi (no internet needed).

## Parts

| Part | Notes |
| --- | --- |
| ESP32 dev board (ESP-WROOM-32 / DevKit V1) | any common ESP32 board |
| MPU6050 module (GY-521) | cheap; upgrade to ADXL355 for much lower noise |
| Active buzzer (3.3–5 V) | the kind that beeps on its own |
| Jumper wires + USB cable | data-capable USB cable |

## Wiring

| MPU6050 | ESP32 |
| --- | --- |
| VCC | 3V3 |
| GND | GND |
| SDA | GPIO 21 |
| SCL | GPIO 22 |

Buzzer: `+` → GPIO 25, `−` → GND.

## Install & upload (Linux terminal)

```bash
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=~/.local/bin sh
arduino-cli config init --overwrite
arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install esp32:esp32
arduino-cli lib install WebSockets
sudo usermod -aG dialout $USER   # then log out and back in once
```

Put your Wi-Fi name and password into `sensor/quake_sensor/quake_sensor.ino`, then:

```bash
arduino-cli board list
arduino-cli compile --fqbn esp32:esp32:esp32 sensor/quake_sensor
arduino-cli upload -p /dev/ttyUSB0 --fqbn esp32:esp32:esp32 sensor/quake_sensor
arduino-cli monitor -p /dev/ttyUSB0 -c baudrate=115200
```

The serial monitor prints the sensor's IP address. In the globe, open **📡 My sensor**, enter the IP
(or `quake-sensor.local`) and press **Connect**.

## Placement & tuning

- Fix the board firmly to the floor or a wall close to the foundation, ideally on the ground floor.
- Keep it away from doors, washing machines and walking paths.
- Leave it still for 30 s after power-on while it learns the background noise.
- Too many false alarms? Raise `TRIGGER_RATIO` or `MIN_STA_MG`. Not sensitive enough? Lower them.

## Limits

- One sensor gives only a few seconds of warning, and only for distant earthquakes. Near the epicenter there is none.
- Trucks, doors and footsteps can cause false alarms. Real warning systems combine many stations.
- The MPU6050 only notices fairly strong shaking (roughly intensity IV and up).
- This is a learning project, not a replacement for official warning systems.
