export interface TaxClass {
  id: string;
  name: string;
  code: string;
}

export interface TaxZone {
  id: string;
  name: string;
  zone: string | null;
  regex: string | null;
  priority: number | null;
}

export interface TaxRule {
  id: number;
  sort: number | null;
  name: string | null;
  tax_zone_id: string | TaxZone;
  tax_class_id: string | TaxClass;
  rate: number | null;
  surcharge: number | null;
}
