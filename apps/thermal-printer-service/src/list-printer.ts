import net from "net";
import ping from "ping";
import os from "os";
import { Device } from "usb";
import * as usb from "usb";

export interface PrinterInfo {
  usbDevices: UsbPrinterDevice[];
  networkDevices: NetworkPrinterDevice[];
}

export interface UsbPrinterDevice {
  manufacturer: string;
  product: string;
  vendor_id: number;
  product_id: number;
}

export interface NetworkPrinterDevice {
  ip: string;
  ports: number[];
}

interface PrinterPort {
  ip: string;
  port: number;
  isPrinter: boolean;
}

export async function listPrinter(): Promise<PrinterInfo> {
  try {
    const usbDevices = await getUsbDevices();
    const networkDevices = await scanForPrinters();

    return {
      usbDevices,
      networkDevices,
    };
  } catch (error) {
    console.error(error);
    return {
      usbDevices: [],
      networkDevices: [],
    };
  }
}

function getStringDescriptor(device: Device, index: number): Promise<string> {
  return new Promise((resolve, reject) => {
    device.open();
    device.getStringDescriptor(index, (error, data) => {
      device.close();
      if (error) {
        device.close();
        reject(error);
      } else {
        device.close();
        resolve(data ?? "");
      }
    });
  });
}

async function getUsbDevices(): Promise<UsbPrinterDevice[]> {
  const devices = usb.getDeviceList();
  const result: UsbPrinterDevice[] = [];
  for (const [index, device] of devices.entries()) {
    const deviceDescriptor = device.deviceDescriptor;

    try {
      const manufacturer =
        (await getStringDescriptor(device, deviceDescriptor.iManufacturer)) ||
        "Unknown";
      const product =
        (await getStringDescriptor(device, deviceDescriptor.iProduct)) ||
        "Unknown";

      result.push({
        manufacturer: manufacturer,
        product: product,
        vendor_id: deviceDescriptor.idVendor,
        product_id: deviceDescriptor.idProduct,
      });
    } catch (error) {
      console.error(
        `Failed to get descriptor for Printer ${index + 1}:`,
        error
      );
    }
  }
  return result;
}

// Function to get the local network IP range
function getLocalNetworkRange(): string {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;

    for (const config of iface) {
      if (config.family === "IPv4" && !config.internal) {
        const ip = config.address.split(".");
        return `${ip[0]}.${ip[1]}.${ip[2]}`;
      }
    }
  }
  throw new Error("Unable to determine local network range.");
}

// Function to check if a specific port is open and identify printers
function checkPrinter(
  ip: string,
  callback: (err: Error | null, ports: PrinterPort[]) => void
) {
  const printerPorts = [9100, 631, 515];

  const checkPort = (port: number) => {
    return new Promise<PrinterPort>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);

      socket.on("connect", () => {
        socket.destroy();
        resolve({ ip, port, isPrinter: true });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ ip, port, isPrinter: false });
      });

      socket.on("error", () => {
        socket.destroy();
        resolve({ ip, port, isPrinter: false });
      });

      socket.connect(port, ip);
    });
  };

  const promises = printerPorts.map((port) => checkPort(port));

  Promise.all(promises)
    .then((results) => {
      callback(
        null,
        results.filter((result) => result.isPrinter)
      );
    })
    .catch((err) => {
      callback(err, []);
    });
}

// Function to scan an IP range in parallel
async function scanNetworkRange(
  baseIP: string
): Promise<NetworkPrinterDevice[]> {
  const maxIPs = 254;
  const concurrentScans = 20; // Limit concurrent scans to avoid overwhelming the network
  const results: NetworkPrinterDevice[] = [];

  // Process IPs in batches to control concurrency
  for (let i = 1; i <= maxIPs; i += concurrentScans) {
    const batch = [];

    for (let j = 0; j < concurrentScans && i + j <= maxIPs; j++) {
      const ip = `${baseIP}.${i + j}`;
      batch.push(scanIP(ip));
    }

    const batchResults = await Promise.all(batch);
    results.push(
      ...batchResults.filter(
        (result): result is NetworkPrinterDevice => result !== null
      )
    );
  }

  return results;

  async function scanIP(ip: string): Promise<NetworkPrinterDevice | null> {
    try {
      const pingResult = await ping.promise.probe(ip, { timeout: 1 });

      if (pingResult.alive) {
        return new Promise<NetworkPrinterDevice | null>((resolve) => {
          checkPrinter(ip, (err: Error | null, printerPorts: PrinterPort[]) => {
            if (err || printerPorts.length === 0) {
              resolve(null);
            } else {
              resolve({
                ip,
                ports: printerPorts.map((p) => p.port),
              });
            }
          });
        });
      }
    } catch (error) {
      console.error(`Error scanning IP ${ip}:`, error);
    }

    return null;
  }
}

async function scanForPrinters(): Promise<NetworkPrinterDevice[]> {
  try {
    const baseIP = getLocalNetworkRange();
    return await scanNetworkRange(baseIP);
  } catch (err) {
    console.error("Error scanning network:", err);
    throw err;
  }
}
