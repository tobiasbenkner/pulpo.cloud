export type Align = "LT" | "CT" | "RT";
export type Font = "A" | "B" | "C";
export type FontSize = "big" | "small";
export type Style = "B" | "I" | "NORMAL";

export type Col = {
  text: string;
  align: "LEFT" | "CENTER" | "RIGHT";
  width: number;
  style: Style;
};

export type PrintLine = {
  type: "text" | "qr" | "qr" | "line" | "newLine" | "table" | "image";
  fontSize: FontSize;
  font: Font;
  align: Align;
  text: string | Col[];
  style: Style;
};

export type PrinterSettingsElectron = {
  connection: "USB" | "IP";
  ip?: string;
  port?: number;
  vendor_id?: number;
  product_id?: number;
  width: number;
  encoding: string;
  replace_accents: boolean;
  feed: number;
};

export type PrintJobElectron = {
  printer: PrinterSettingsElectron;
  document: PrintLine[];
  open?: boolean;
};

export type PrinterInfo = {
  usbDevices: {
    manufacturer: string;
    product: string;
    vendor_id: number;
    product_id: number;
  }[];
  networkDevices: {
    // manufacturer: string;
    // product: string;
    ip: string;
    ports: number[];
  }[];
};
