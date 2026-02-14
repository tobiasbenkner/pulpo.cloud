export interface Customer {
  id: string;
  name: string;
  nif: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tenant: string;
  date_created: string;
}
