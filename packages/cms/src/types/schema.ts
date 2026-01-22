import { BlogPost, BlogPostCategory, BlogPostTranslation } from "./blog";
import { Reservation, ReservationSetting } from "./reservation";
import { Language } from "./language";
import { User } from "./user";

export interface Schema {
  posts: BlogPost[];
  posts_translations: BlogPostTranslation[];
  posts_categories: BlogPostCategory[];
  reservations: Reservation[];
  reservations_settings: ReservationSetting[];
  directus_users: User[];
  languages: Language[];
}
