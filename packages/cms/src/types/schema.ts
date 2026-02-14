import { Reservation, ReservationTurn } from "./agenda";
import { CashRegisterClosure } from "./cash-register";
import { Customer } from "./customer";
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

  customers: Customer[];

  invoices: Invoice[];
  invoice_items: InvoiceItem[];
  invoice_payments: InvoicePayment[];

  cash_register_closures: CashRegisterClosure[];

  reservations: Reservation[];
  reservations_turns: ReservationTurn[];
  directus_users: User[];
  languages: Language[];
}
