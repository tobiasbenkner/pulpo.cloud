# @pulpocloud/thermal-printer-service

Standalone microservice for controlling thermal receipt printers via USB or Network (TCP/IP) connections.

Built with **Express.js 5** + **TypeScript** + **@node-escpos**. Provides REST API endpoints for printing receipts, discovering printers, and controlling cash drawers.

## Features

- Receipt printing with rich formatting (text, images, QR codes, tables)
- USB and network printer support
- Automatic printer discovery (USB enumeration + network scanning)
- Cash drawer control via ESC/POS
- Image processing (WebP to PNG conversion via sharp)
- Multi-encoding support (CP858, CP850, etc.)

## Getting Started

```bash
# Development (with ts-node)
npm run dev

# Production
npm run build
npm start
```

Server starts on `http://0.0.0.0:8080`.

## API Endpoints

### `GET /thermal-printer-service/status`

Health check. Returns `{ "status": "OK" }`.

### `GET /thermal-printer-service/list-printer`

Discovers USB and network printers. Network scan probes ports 9100, 631, 515 and takes ~20-30 seconds.

```json
{
  "usbDevices": [{ "manufacturer": "EPSON", "product": "TM-20II", "vendor_id": 1208, "product_id": 272 }],
  "networkDevices": [{ "ip": "192.168.1.50", "ports": [9100] }]
}
```

### `POST /thermal-printer-service/print`

Sends a print job. Body: `{ printer: PrinterSettings, document: PrintLine[], open?: boolean }`.

**PrintLine types**: `text`, `line`, `newLine`, `qr`, `table`, `image`

### `POST /thermal-printer-service/open-cashdrawer`

Opens the cash drawer. Body: `PrinterSettings` (same printer config as print).

## Printer Configuration

```typescript
// USB
{ connection: "USB", vendor_id: 0x0483, product_id: 0x0110, width: 32, encoding: "CP858", replace_accents: true, feed: 5 }

// Network
{ connection: "IP", ip: "192.168.1.50", port: 9100, width: 32, encoding: "CP858", replace_accents: true, feed: 5 }
```

## Tech Stack

| Technology | Purpose |
|---|---|
| [Express.js 5](https://expressjs.com) | HTTP server |
| [@node-escpos](https://github.com/nicklaslin/node-escpos) | ESC/POS protocol |
| [sharp](https://sharp.pixelplumbing.com) | Image processing |
| [usb](https://github.com/node-usb/node-usb) | USB device access |

## CLI

Installable as global CLI tool:

```bash
npm install -g @pulpocloud/thermal-printer-service
pulpo-printer
```

## Publishing

```bash
./release.sh  # Builds, publishes to npm, increments version
```
