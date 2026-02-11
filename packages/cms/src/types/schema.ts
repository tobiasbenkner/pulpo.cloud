import { Reservation, ReservationTurn } from "./agenda";
import { Invoice, InvoiceItem, InvoicePayment } from "./invoice";
import { Language } from "./language";
import { TaxClass, TaxRule, TaxZone } from "./tax";
import { User } from "./user";

export interface Schema {
  posts: any[];
  posts_categories: any[];
  events: any[];

  categories: any[];
  products: any[];
  tax_classes: TaxClass[];
  tax_zones: TaxZone[];
  tax_rules: TaxRule[];
  opening_hours: any[];
  tenants: any[];

  invoices: Invoice[];
  invoice_items: InvoiceItem[];
  invoice_payments: InvoicePayment[];

  reservations: Reservation[];
  reservations_turns: ReservationTurn[];
  directus_users: User[];
  languages: Language[];
}
