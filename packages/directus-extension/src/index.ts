import { defineEndpoint } from "@directus/extensions-sdk";
import { registerCashRegisterOpen } from "./routes/cash-register-open";
import { registerCashRegisterClose } from "./routes/cash-register-close";
import { registerInvoiceCreate } from "./routes/invoice-create";
import { registerInvoiceRectify } from "./routes/invoice-rectify";
import { registerReports } from "./routes/reports";
import { registerHealth } from "./routes/health";

export default defineEndpoint((router, context) => {
  registerHealth(router);
  registerCashRegisterOpen(router, context);
  registerCashRegisterClose(router, context);
  registerInvoiceCreate(router, context);
  registerInvoiceRectify(router, context);
  registerReports(router, context);
});
