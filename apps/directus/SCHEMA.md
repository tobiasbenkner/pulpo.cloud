# Directus Schema Reference

> Auto-generated from snapshot.yaml — do not edit manually
> Directus 11.15.3 / PostgreSQL

## Collection Groups (Folders)

- **finance**: cash_register_closures, customers, invoice_items, invoice_payments, invoices, tax_classes, tax_rules, tax_zones

## actions

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| tenant | uuid | yes | tenants.id | M2O, required |
| translations | alias | yes |  | translations |
| type | character varying | yes |  | choices: internal, external, email, tel, whatsapp |
| url | character varying | yes |  |  |
| title | character varying | yes |  | required |
| sort | integer | yes |  |  |

## actions_translations

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | integer | no |  |  |
| actions_id | uuid | yes | actions.id |  |
| languages_id | uuid | yes | languages.id |  |
| label | character varying | yes |  |  |
| title | character varying | yes |  |  |
| subtitle | character varying | yes |  |  |
| action | character varying | yes |  |  |

## cash_register_closures

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| date_created | timestamp with time zone | yes |  | auto |
| tenant | uuid | yes | tenants.id | M2O, required |
| period_start | timestamp with time zone | yes |  |  |
| period_end | timestamp with time zone | yes |  |  |
| total_gross | numeric | yes |  |  |
| total_net | numeric | yes |  |  |
| total_tax | numeric | yes |  |  |
| total_cash | numeric | yes |  |  |
| total_card | numeric | yes |  |  |
| total_change | numeric | yes |  |  |
| transaction_count | integer | yes |  |  |
| starting_cash | numeric | yes |  |  |
| expected_cash | numeric | yes |  |  |
| counted_cash | numeric | yes |  |  |
| difference | numeric | yes |  |  |
| tax_breakdown | json | yes |  | JSON |
| status | character varying | yes |  | choices: open, closed |
| denomination_count | json | yes |  | JSON |
| product_breakdown | json | yes |  | JSON |
| invoice_type_counts | json | yes |  | JSON |

## categories

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| sort | integer | yes |  |  |
| translations | alias | yes |  | translations |
| tenant | uuid | yes | tenants.id | M2O, required |
| image | uuid | yes | directus_files.id |  |
| products | alias | yes |  | O2M |
| name | character varying | yes |  | required |

## categories_translations

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | integer | no |  |  |
| categories_id | uuid | yes | categories.id |  |
| languages_id | uuid | yes | languages.id |  |
| name | character varying | yes |  |  |
| description | text | yes |  |  |

## cost_centers

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| name | character varying | yes |  | required |
| tenant | uuid | yes | tenants.id | M2O, required |
| sort | integer | yes |  |  |

## customers

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| date_created | timestamp with time zone | yes |  | auto |
| tenant | uuid | no | tenants.id | M2O, required |
| nif | character varying | yes |  |  |
| apply_surcharge | boolean | yes |  |  |
| name | character varying | yes |  | required |
| street | character varying | yes |  |  |
| city | character varying | yes |  |  |
| zip | character varying | yes |  |  |
| email | character varying | yes |  |  |
| phone | character varying | yes |  |  |
| notes | text | yes |  |  |

## events

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| date | date | yes |  |  |
| time | time without time zone | yes |  |  |
| price | numeric | yes |  |  |
| image | uuid | yes | directus_files.id |  |
| translations | alias | yes |  | translations |
| tenant | uuid | yes | tenants.id | M2O, required |

## events_translations

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | integer | no |  |  |
| events_id | uuid | yes | events.id |  |
| languages_id | uuid | yes | languages.id |  |
| title | character varying | yes |  |  |
| description | text | yes |  |  |
| slug | character varying | yes |  |  |
| seo | json | yes |  | JSON |

## invoice_items

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| invoice_id | uuid | yes | invoices.id | M2O |
| product_name | character varying | yes |  | required |
| quantity | numeric | yes |  |  |
| tax_rate_snapshot | numeric | yes |  |  |
| price_gross_unit | numeric | yes |  |  |
| price_net_unit_precise | numeric | yes |  |  |
| row_total_net_precise | numeric | yes |  |  |
| row_total_gross | numeric | yes |  |  |
| tenant | uuid | yes | tenants.id | M2O, required |
| discount_type | character varying | yes |  | choices: percent, fixed |
| discount_value | numeric | yes |  |  |
| product_id | uuid | yes | products.id | M2O, required |
| cost_center | character varying | yes |  |  |

## invoice_payments

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| user_created | uuid | yes | directus_users.id | auto |
| date_created | timestamp with time zone | yes |  | auto |
| tenant | uuid | yes | tenants.id | M2O, required |
| invoice_id | uuid | yes | invoices.id | M2O, required |
| method | character varying | yes |  | required, choices: cash, card |
| amount | numeric | yes |  |  |
| tendered | numeric | yes |  |  |
| change | numeric | yes |  |  |
| tip | numeric | yes |  |  |

## invoices

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| date_created | timestamp with time zone | yes |  | auto |
| invoice_number | character varying | yes |  | required |
| total_net | numeric | yes |  |  |
| total_tax | numeric | yes |  |  |
| total_gross | numeric | yes |  |  |
| tenant | uuid | yes | tenants.id | M2O, required |
| status | character varying | yes |  | choices: draft, paid, cancelled, rectificada |
| previous_record_hash | character varying | yes |  |  |
| chain_hash | character varying | yes |  |  |
| qr_url | character varying | yes |  |  |
| generation_date | character varying | yes |  |  |
| items | alias | yes |  | O2M, required |
| closure_id | uuid | yes | cash_register_closures.id | M2O, required |
| discount_type | character varying | yes |  | choices: percent, fixed |
| discount_value | numeric | yes |  |  |
| invoice_type | character varying | yes |  | required, choices: ticket, factura, rectificativa |
| original_invoice_id | uuid | yes | invoices.id | M2O |
| rectification_reason | character varying | yes |  |  |
| customer_id | uuid | yes | customers.id | M2O |
| customer_name | character varying | yes |  |  |
| customer_nif | character varying | yes |  |  |
| customer_street | character varying | yes |  |  |
| customer_zip | character varying | yes |  |  |
| customer_city | character varying | yes |  |  |
| customer_email | character varying | yes |  |  |
| customer_phone | character varying | yes |  |  |
| payments | alias | yes |  | O2M, required |

## languages

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| sort | integer | yes |  |  |
| code | character varying | yes |  | required |
| name | character varying | yes |  |  |
| tenant | uuid | yes | tenants.id | M2O, required |
| flag | character varying | yes |  |  |

## opening_hours

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| sort | integer | yes |  |  |
| tenant | uuid | yes | tenants.id | M2O |
| translations | alias | yes |  | translations |
| title | character varying | yes |  |  |

## opening_hours_translations

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | integer | no |  |  |
| opening_hours_id | uuid | yes | opening_hours.id |  |
| languages_id | uuid | yes | languages.id |  |
| days_label | character varying | yes |  |  |
| hours_text | character varying | yes |  |  |
| additional_info | character varying | yes |  |  |

## posts

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| status | character varying | no |  | choices: published, draft, archived |
| translations | alias | yes |  | translations |
| tenant | uuid | yes | tenants.id | M2O |
| title | character varying | yes |  |  |
| image | uuid | yes | directus_files.id |  |
| category | uuid | yes | posts_categories.id | M2O |
| date | date | yes |  |  |

## posts_categories

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| tenant | uuid | yes | tenants.id | M2O |
| title | character varying | yes |  |  |
| translations | alias | yes |  | translations |

## posts_categories_translations

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | integer | no |  |  |
| posts_categories_id | uuid | yes | posts_categories.id |  |
| languages_id | uuid | yes | languages.id |  |
| slug | character varying | yes |  |  |
| nav_label | character varying | yes |  |  |
| seo | json | yes |  | JSON |
| title | character varying | yes |  |  |
| description | text | yes |  |  |

## posts_translations

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | integer | no |  |  |
| posts_id | uuid | yes | posts.id |  |
| languages_id | uuid | yes | languages.id |  |
| title | character varying | yes |  |  |
| slug | character varying | yes |  |  |
| seo | json | yes |  | JSON |
| content | text | yes |  |  |
| excerpt | text | yes |  |  |

## products

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| sort | integer | yes |  |  |
| translations | alias | yes |  | translations, required |
| tenant | uuid | yes | tenants.id | M2O, required |
| image | uuid | yes | directus_files.id |  |
| category | uuid | yes | categories.id | M2O, required |
| allergies | json | yes |  | JSON, choices: celery, crustaceans, dairy, egg, fish, gluten, legumes, mollusks, mustard, nuts, peanut, sesame, soy, sulfites |
| price_gross | numeric | yes |  |  |
| tax_class | uuid | yes | tax_classes.id | M2O |
| stock | integer | yes |  |  |
| cost_center | uuid | yes | cost_centers.id | M2O |
| name | character varying | yes |  | required |

## products_translations

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | integer | no |  |  |
| products_id | uuid | yes | products.id |  |
| languages_id | uuid | yes | languages.id |  |
| name | character varying | yes |  | required |
| description | text | yes |  |  |
| note | character varying | yes |  |  |

## reservations

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| user_created | uuid | yes | directus_users.id | auto |
| date_created | timestamp with time zone | yes |  | auto |
| user_updated | uuid | yes | directus_users.id | auto |
| date_updated | timestamp with time zone | yes |  | auto |
| date | date | yes |  | required |
| time | time without time zone | yes |  | required |
| name | character varying | yes |  |  |
| tenant | uuid | yes | tenants.id | M2O, required |
| person_count | integer | yes |  |  |
| contact | character varying | yes |  |  |
| notes | text | yes |  |  |
| user | uuid | yes | directus_users.id | M2O |
| arrived | boolean | yes |  |  |

## reservations_turns

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | integer | no |  |  |
| tenant | uuid | yes | tenants.id | M2O |
| start | time without time zone | yes |  |  |
| label | character varying | yes |  |  |
| color | character varying | yes |  |  |

## tax_classes

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| name | character varying | yes |  | required |
| code | character varying | yes |  |  |

## tax_rules

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | integer | no |  |  |
| sort | integer | yes |  |  |
| tax_zone_id | uuid | yes | tax_zones.id | M2O, required |
| tax_class_id | uuid | yes | tax_classes.id | M2O, required |
| rate | numeric | yes |  |  |
| surcharge | numeric | yes |  |  |
| name | character varying | yes |  |  |

## tax_zones

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| name | character varying | yes |  | required |
| regex | character varying | yes |  |  |
| priority | integer | yes |  |  |

## tenants

| Field | Type | Nullable | FK | Notes |
|-------|------|----------|----|-------|
| id | uuid | no |  | PK |
| date_created | timestamp with time zone | yes |  | auto |
| name | character varying | yes |  | required |
| street | character varying | yes |  |  |
| postcode | character varying | yes |  |  |
| city | character varying | yes |  |  |
| tiktok | character varying | yes |  |  |
| youtube | character varying | yes |  |  |
| tripadvisor | character varying | yes |  |  |
| yelp | character varying | yes |  |  |
| restaurantguru | character varying | yes |  |  |
| instagram | character varying | yes |  |  |
| facebook | character varying | yes |  |  |
| maps | text | yes |  |  |
| opening_hours | alias | yes |  | O2M |
| contacts | alias | yes |  | O2M |
| nif | character varying | yes |  |  |
| invoice_prefix | character varying | yes |  |  |
| timezone | character varying | yes |  | choices: Europe/Madrid, Atlantic/Canary, Africa/Ceuta |
| invoice_image | uuid | yes | directus_files.id |  |
| last_rectificativa_number | integer | yes |  |  |
| last_ticket_number | integer | yes |  |  |
| last_factura_number | integer | yes |  |  |
| report_emails | json | yes |  | JSON |

## Relations

| Collection | Field | Related Collection | Related Field | Type |
|-----------|-------|--------------------|---------------|------|
| actions | tenant | tenants | contacts | M2O |
| actions_translations | languages_id | languages |  | M2O |
| actions_translations | actions_id | actions | translations | M2O |
| cash_register_closures | tenant | tenants |  | M2O |
| categories | tenant | tenants |  | M2O |
| categories | image | directus_files |  | M2O |
| categories_translations | languages_id | languages |  | M2O |
| categories_translations | categories_id | categories | translations | M2O |
| cost_centers | tenant | tenants |  | M2O |
| customers | tenant | tenants |  | M2O |
| directus_files | tenant | tenants |  | M2O |
| directus_users | tenant | tenants |  | M2O |
| events | image | directus_files |  | M2O |
| events | tenant | tenants |  | M2O |
| events_translations | languages_id | languages |  | M2O |
| events_translations | events_id | events | translations | M2O |
| invoice_items | invoice_id | invoices | items | M2O |
| invoice_items | tenant | tenants |  | M2O |
| invoice_items | product_id | products |  | M2O |
| invoice_payments | user_created | directus_users |  | M2O |
| invoice_payments | tenant | tenants |  | M2O |
| invoice_payments | invoice_id | invoices | payments | M2O |
| invoices | tenant | tenants |  | M2O |
| invoices | closure_id | cash_register_closures |  | M2O |
| invoices | original_invoice_id | invoices |  | M2O |
| invoices | customer_id | customers |  | M2O |
| languages | tenant | tenants |  | M2O |
| opening_hours | tenant | tenants | opening_hours | M2O |
| opening_hours_translations | languages_id | languages |  | M2O |
| opening_hours_translations | opening_hours_id | opening_hours | translations | M2O |
| posts | tenant | tenants |  | M2O |
| posts | image | directus_files |  | M2O |
| posts | category | posts_categories |  | M2O |
| posts_categories | tenant | tenants |  | M2O |
| posts_categories_translations | languages_id | languages |  | M2O |
| posts_categories_translations | posts_categories_id | posts_categories | translations | M2O |
| posts_translations | languages_id | languages |  | M2O |
| posts_translations | posts_id | posts | translations | M2O |
| products | tenant | tenants |  | M2O |
| products | image | directus_files |  | M2O |
| products | category | categories | products | M2O |
| products | tax_class | tax_classes |  | M2O |
| products | cost_center | cost_centers |  | M2O |
| products_translations | languages_id | languages |  | M2O |
| products_translations | products_id | products | translations | M2O |
| reservations | user_created | directus_users |  | M2O |
| reservations | user_updated | directus_users |  | M2O |
| reservations | tenant | tenants |  | M2O |
| reservations | user | directus_users |  | M2O |
| reservations_turns | tenant | tenants |  | M2O |
| tax_rules | tax_zone_id | tax_zones |  | M2O |
| tax_rules | tax_class_id | tax_classes |  | M2O |
| tenants | invoice_image | directus_files |  | M2O |
