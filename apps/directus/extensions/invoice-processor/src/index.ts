import { defineEndpoint } from "@directus/extensions-sdk";

export default defineEndpoint((router) => {
  router.get("/", (_req, res) => res.send("Hello, World!"));
});


// export default {
//     id: 'invoice-processor', // Wichtig: Der Pfad wird /invoice-processor sein
//     handler: (router, { services, database }) => {
//         const { ItemsService } = services;

//         router.post('/create-invoice', async (req, res) => {
//             // Validierung: Haben wir alles?
//             if (!req.body.closure_id || !req.body.amount) {
//                 return res.status(400).json({ error: 'Missing data' });
//             }

//             // Transaktion starten
//             const trx = await database.transaction();

//             try {
//                 // Services mit der Transaktion (trx) initialisieren
//                 // schema: req.schema ist wichtig für Permissions und Felder
//                 const invoiceService = new ItemsService('invoices', { schema: req.schema, knex: trx });
//                 const closureService = new ItemsService('cash_closures', { schema: req.schema, knex: trx });

//                 // 1. Rechnung erstellen
//                 const newInvoice = await invoiceService.createOne({
//                     status: 'draft',
//                     amount: req.body.amount,
//                     client: req.body.client,
//                     // Hier evtl. Logik für Rechnungsnummer-Generierung einfügen
//                     invoice_number: `INV-${Date.now()}` 
//                 });

//                 // 2. Kassenabschluss updaten
//                 await closureService.updateOne(req.body.closure_id, {
//                     status: 'closed',
//                     linked_invoice: newInvoice.id
//                 });

//                 // Alles erfolgreich -> Commit
//                 await trx.commit();

//                 // Erfolg melden
//                 return res.json({ success: true, invoice_id: newInvoice.id });

//             } catch (error) {
//                 // Fehler -> Rollback (alles rückgängig machen)
//                 await trx.rollback();
                
//                 // Fehler loggen und an Client senden
//                 console.error(error);
//                 return res.status(500).json({ error: error.message });
//             }
//         });
//     }
// };