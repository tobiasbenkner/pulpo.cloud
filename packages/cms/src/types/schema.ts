import { Reservation, ReservationSetting } from "./reservation";
import { Language } from "./language";
import { User } from "./user";

export interface Schema {
  posts: any[];
  posts_categories: any[];
  events: any[];

  categories: any[];
  products: any[];
  opening_hours: any[];
  tenants: any[];

  reservations: Reservation[];
  reservations_settings: ReservationSetting[];
  directus_users: User[];
  languages: Language[];
}
