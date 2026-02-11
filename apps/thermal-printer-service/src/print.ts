import { Printer, Image } from "@node-escpos/core";
import UsbAdapter from "@node-escpos/usb-adapter";
import NetworkAdapter from "@node-escpos/network-adapter";
import { Col, PrintJobElectron } from "./types";
import axios from "axios";
import sharp from "sharp";

function formatTableLine(cols: Col[], totalWidth: number): string {
  let line = "";
  for (const col of cols) {
    const colWidth = Math.floor(totalWidth * col.width);
    const text = col.text.length > colWidth ? col.text.slice(0, colWidth) : col.text;
    const pad = colWidth - text.length;
    if (col.align === "RIGHT") {
      line += " ".repeat(pad) + text;
    } else if (col.align === "CENTER") {
      const left = Math.floor(pad / 2);
      line += " ".repeat(left) + text + " ".repeat(pad - left);
    } else {
      line += text + " ".repeat(pad);
    }
  }
  return line;
}

export async function print(printJob: PrintJobElectron) {
  const printerSettings = printJob.printer;
  let device;
  if (printerSettings.connection === "IP") {
    device = new NetworkAdapter(printerSettings.ip!, printerSettings.port);
  } else {
    device = new UsbAdapter(
      printerSettings.vendor_id,
      printerSettings.product_id
    );
  }

  return new Promise((resolve, reject) => {
    device.open(async function (err) {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }

      try {
        let printer = new Printer(device, {
          encoding: printerSettings.encoding,
          width: printerSettings.width,
        });

        const document = printJob.document;
        for (const line of document) {
          if (line.type === "line") {
            printer
              .style("NORMAL")
              .align("CT")
              .size(1, 1)
              .font("A")
              .drawLine("-");
          } else if (line.type === "text") {
            const size = line.fontSize === "small" ? 1 : 2;
            printer
              .align(line.align)
              .size(size, size)
              .font(line.font)
              .style(line.style)
              .println(line.text as string);
          } else if (line.type === "newLine") {
            printer.newLine();
          } else if (line.type === "qr") {
            printer.align("CT").font("A");
            printer = await printer.qrimage(line.text as string, {
              type: "png",
              mode: "dhdw",
              size: 2,
            });
          } else if (line.type === "table") {
            const size = line.fontSize === "small" ? 1 : 2;
            const baseWidth = Math.floor(printerSettings.width / size);
            const cols = line.text as Col[];
            const formatted = formatTableLine(cols, baseWidth);
            printer
              .font(line.font)
              .size(size, size)
              .style(cols[0]?.style || "NORMAL")
              .text(formatted, printerSettings.encoding);
          } else if (line.type === "image") {
            try {
              printer.align("CT");
              const url = await downloadAndConvertWebpToBase64Png(
                line.text as string
              );
              const image = await Image.load(url);
              printer = await printer.image(image);
            } catch (err) {
              console.error(err);
            }
          }
        }

        printer = printer.newLine().newLine().newLine().cut();
        if (printJob.open) {
          printer.cashdraw(2).cashdraw(5);
        }
        printer = await printer.close();
        resolve({});
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  });
}

async function downloadAndConvertWebpToBase64Png(webpUrl: string) {
  const response = await axios({
    url: webpUrl,
    responseType: "arraybuffer",
  });
  const webpBuffer = Buffer.from(response.data);
  const pngBuffer = await sharp(webpBuffer).png().toBuffer();
  const base64Png = `data:image/png;base64,${pngBuffer.toString("base64")}`;

  return base64Png;
}
