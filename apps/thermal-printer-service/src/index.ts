import express from "express";
import { listPrinter } from "./list-printer";
import { print } from "./print";
import { PrinterSettingsElectron, PrintJobElectron } from "./types";
import cors from "cors";
import { openCashDrawer } from "./open-cash-drawer";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/thermal-printer-service/list-printer", async (_, res) => {
  const printer = await listPrinter();
  res.status(200).json(printer);
});

app.post("/thermal-printer-service/print", async (req, res) => {
  const payload = req.body as PrintJobElectron;
  await print(payload);
  res.status(200).json({ status: "OK" });
});

app.post("/thermal-printer-service/open-cashdrawer", async (req, res) => {
  const payload = req.body as PrinterSettingsElectron;
  await openCashDrawer(payload);
  res.status(200).json({ status: "OK" });
});

app.get("/thermal-printer-service/status", (req, res) => {
  res.status(200).json({ status: "OK" });
});

const PORT = 8080;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Thermal printer server running on port ${PORT}`);
  console.log(
    `Status to: http://${HOST}:${PORT}/thermal-printer-service/status`
  );
});
