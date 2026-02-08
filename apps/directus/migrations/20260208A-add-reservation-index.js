export async function up(knex) {
  await knex.schema.alterTable('reservations', (table) => {
    table.index(['tenant', 'date'], 'idx_reservations_tenant_date');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('reservations', (table) => {
    table.dropIndex(['tenant', 'date'], 'idx_reservations_tenant_date');
  });
}
