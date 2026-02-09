import { PrinterSettingsElectron } from "./types";
import UsbAdapter from "@node-escpos/usb-adapter";
import NetworkAdapter from "@node-escpos/network-adapter";
import { Printer } from "@node-escpos/core";

export async function openCashDrawer(printerSettings: PrinterSettingsElectron) {
  let device;
  if (printerSettings.connection === "IP") {
    device = new NetworkAdapter(printerSettings.ip ?? "", printerSettings.port);
  } else {
    device = new UsbAdapter(
      printerSettings.vendor_id,
      printerSettings.product_id
    );
  }
  return new Promise((resolve, reject) => {
    device.open(async (error) => {
      if (error) {
        device.close();
        reject(error);
      }

      try {
        let printer = new Printer(device, {
          encoding: "GB18030",
        });
        await printer.cashdraw(2).cashdraw(5).close();
        resolve({});
      } catch (err) {
        reject(err);
      }
    });
  });
}
