import { Reservation, ReservationTurn } from "./agenda";
import { Language } from "./language";
import { User } from "./user";

export interface Schema {
  posts: any[];
  posts_categories: any[];
  events: any[];

  categories: any[];
  products: any[];
  tax_classes: any[];
  opening_hours: any[];
  tenants: any[];

  reservations: Reservation[];
  reservations_turns: ReservationTurn[];
  directus_users: User[];
  languages: Language[];
}
