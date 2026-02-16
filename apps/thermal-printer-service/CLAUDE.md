# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Run with ts-node (development)       |
| `npm run build` | Compile TypeScript to `dist/`        |
| `npm start`     | Run compiled `dist/index.js`         |

No test framework is configured. Testing is manual via curl.

## Architecture

### Overview

A standalone **Express.js microservice** for controlling thermal receipt printers. Provides REST API endpoints for printing receipts, discovering printers (USB + network), and opening cash drawers. Used by the `@pulpo/shop` POS application.

### Project Structure

```
src/
├── index.ts              # Express server, route definitions (port 8080)
├── types.ts              # TypeScript types (PrintLine, PrinterSettings, PrintJob, etc.)
├── print.ts              # Print engine: ESC/POS generation, image conversion
├── open-cash-drawer.ts   # Cash drawer actuation (pins 2 + 5)
└── list-printer.ts       # USB device enumeration + network scanning
```

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/thermal-printer-service/status` | Health check |
| GET | `/thermal-printer-service/list-printer` | Discover USB + network printers |
| POST | `/thermal-printer-service/print` | Send print job |
| POST | `/thermal-printer-service/open-cashdrawer` | Open cash drawer |

All routes are prefixed with `/thermal-printer-service/`. CORS is enabled for all origins. Server listens on `0.0.0.0:8080`.

### Printer Connections

**USB**: Uses `@node-escpos/usb-adapter` with `vendor_id` and `product_id` to identify the device.

**Network (IP)**: Uses `@node-escpos/network-adapter` with `ip` and `port` (typically 9100).

Both follow the same pattern:
```typescript
const device = new UsbAdapter(vendor_id, product_id); // or NetworkAdapter(ip, port)
device.open(async (err) => {
  const printer = new Printer(device, { encoding, width });
  // ... ESC/POS commands ...
  await printer.close();
});
```

### Print Job Flow (`print.ts`)

1. Initialize device adapter (USB or Network) based on `printer.connection`
2. Open device connection (callback-based, wrapped in Promise)
3. Create `Printer` instance with encoding and width
4. Iterate through `document: PrintLine[]` and generate ESC/POS commands:
   - `text` — `printer.align().size().font().style().println()`
   - `line` — `printer.drawLine("-")` (horizontal separator)
   - `newLine` — `printer.newLine()`
   - `qr` — `printer.qrimage(text, { type: "png", mode: "dhdw", size: 2 })`
   - `table` — `formatTableLine()` calculates column widths, pads/aligns text
   - `image` — Download WebP URL, convert to PNG via `sharp` (200px max width), print
5. Finalize: 3 newlines, cut paper, optionally open cash drawer (pins 2 + 5)
6. Close device, resolve promise

### Image Processing

`downloadAndConvertWebpToBase64Png(url)` in `print.ts`:
1. Download image via axios (arraybuffer)
2. Convert with sharp: resize to 200px width, convert to PNG
3. Return as base64 data URL (`data:image/png;base64,...`)
4. Load via `Image.load()` from `@node-escpos/core`

Image errors are caught and logged but don't fail the print job.

### Table Formatting

`formatTableLine(cols, totalWidth)` in `print.ts`:
- `totalWidth = Math.floor(printerSettings.width / fontSize)` (e.g. 32/2 = 16 for big text)
- Each `Col` has `width` as proportion (0.0-1.0), `align` (LEFT/CENTER/RIGHT), `style`
- Text is truncated to column width, then padded according to alignment

### Printer Discovery (`list-printer.ts`)

**USB enumeration**:
- `usb.getDeviceList()` returns all connected USB devices
- For each device, queries `iManufacturer` and `iProduct` string descriptors
- Returns `{ manufacturer, product, vendor_id, product_id }[]`
- Note: Returns ALL USB devices, not just printers

**Network scanning**:
- Detects local network range from `os.networkInterfaces()` (first non-internal IPv4)
- Pings IPs 1-254 in batches of 20 concurrent scans (1-second ping timeout)
- For reachable IPs, probes ports 9100 (ESC/POS), 631 (CUPS), 515 (LPR) with 2-second socket timeout
- Returns `{ ip, ports }[]` for devices with open printer ports
- Full scan takes ~20-30 seconds

### Cash Drawer (`open-cash-drawer.ts`)

Opens device, sends `cashdraw(2)` and `cashdraw(5)` (two pin sequences for compatibility), closes device. Same USB/Network adapter pattern as printing.

### Type System (`types.ts`)

```typescript
PrintLine     // Document element: type, fontSize, font, align, text, style
Col           // Table column: text, align (LEFT/CENTER/RIGHT), width (0-1), style
PrinterSettingsElectron  // Printer config: connection (USB/IP), vendor/product IDs or IP/port, width, encoding, feed
PrintJobElectron         // Full payload: printer + document + open (cash drawer flag)
PrinterInfo              // Discovery result: usbDevices[] + networkDevices[]
```

**PrintLine types**: `text`, `qr`, `line`, `newLine`, `table`, `image`
**Font sizes**: `big` (2x2) or `small` (1x1)
**Alignment**: `LT` (left), `CT` (center), `RT` (right)
**Styles**: `B` (bold), `I` (italic), `NORMAL`
**Fonts**: `A`, `B`, `C`

### Error Handling

- **Device open fails**: Promise rejects, error logged
- **Image download/conversion fails**: Caught and logged, printing continues
- **Network scan errors**: Returns empty arrays, error logged
- **Print errors**: Caught in try/catch, promise rejects

### Dependencies

| Package | Purpose |
|---------|---------|
| `@node-escpos/core` | ESC/POS protocol, Printer class, Image class |
| `@node-escpos/usb-adapter` | USB device adapter |
| `@node-escpos/network-adapter` | TCP/IP device adapter |
| `usb` | USB device enumeration |
| `express` | HTTP server (v5) |
| `cors` | CORS middleware |
| `axios` | HTTP client (image downloads) |
| `sharp` | Image processing (WebP to PNG) |
| `ping` | ICMP ping for network scanning |

### Integration with Shop App

The `@pulpo/shop` POS app calls this service from `printerStore.ts`:
1. `printInvoice(invoice)` maps invoice data to `PrintLine[]` format
2. Sends HTTP POST to `/thermal-printer-service/print`
3. `open: true` flag triggers cash drawer after printing

### Encoding

Recommended: `CP858` (Portugal/Spain) for Spanish receipts. The `replace_accents` flag in printer settings allows replacing accented characters with ASCII equivalents for printers that don't support the selected code page.

### Deployment

- **Development**: `npm run dev` (ts-node, hot reload)
- **Production**: `npm run build && npm start`
- **npm package**: Published as `@pulpocloud/thermal-printer-service` via `./release.sh`
- **CLI**: Installable globally as `pulpo-printer`

### Notes

- USB access may require elevated privileges on Linux/macOS
- Images are hard-coded to 200px max width for receipt format
- Cash drawer uses pins 2 and 5 — may need adjustment for some printers
- Network scanning takes 20-30 seconds for a full subnet
- Port 8080 is hard-coded in `index.ts`
