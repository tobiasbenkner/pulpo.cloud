import { defineEndpoint } from "@directus/extensions-sdk";
import { registerCashRegisterOpen } from "./routes/cash-register-open";
import { registerCashRegisterClose } from "./routes/cash-register-close";
import { registerInvoiceCreate } from "./routes/invoice-create";

export default defineEndpoint((router, context) => {
  router.get("/", (_req, res) => res.send("Hello, World!"));

  registerCashRegisterOpen(router, context);
  registerCashRegisterClose(router, context);
  registerInvoiceCreate(router, context);
});
