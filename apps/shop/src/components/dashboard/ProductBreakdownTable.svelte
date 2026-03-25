<script lang="ts">
	import type { ClosureProductBreakdown } from "@pulpo/cms";
	import * as Table from "$lib/components/ui/table/index.js";

	let {
		products,
		title = "Productos",
	}: {
		products: ClosureProductBreakdown[];
		title?: string;
	} = $props();

	interface CostCenterGroup {
		name: string;
		rows: ClosureProductBreakdown[];
		totalQty: number;
		totalGross: string;
		totalCash: string;
		totalCard: string;
	}

	function fmt(v: string | number): string {
		const n = typeof v === "string" ? parseFloat(v) : v;
		return n.toLocaleString("es-ES", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	}

	function groupByCostCenter(items: ClosureProductBreakdown[]): CostCenterGroup[] {
		const groups = new Map<string, ClosureProductBreakdown[]>();
		for (const row of items) {
			const key = row.cost_center ?? "";
			const existing = groups.get(key) ?? [];
			existing.push(row);
			groups.set(key, existing);
		}
		return Array.from(groups.entries())
			.sort(([a], [b]) => {
				if (a === "" && b !== "") return 1;
				if (a !== "" && b === "") return -1;
				return a.localeCompare(b);
			})
			.map(([name, rows]) => {
				let qty = 0, gross = 0, cash = 0, card = 0;
				for (const r of rows) {
					qty += r.quantity;
					gross += parseFloat(r.total_gross);
					cash += parseFloat(r.cash_gross);
					card += parseFloat(r.card_gross);
				}
				return { name, rows, totalQty: qty, totalGross: gross.toFixed(2), totalCash: cash.toFixed(2), totalCard: card.toFixed(2) };
			});
	}

	let grouped = $derived(groupByCostCenter(products));
	let hasCostCenters = $derived(
		grouped.length > 1 || (grouped.length === 1 && grouped[0].name !== ""),
	);
</script>

{#if products.length > 0}
	<div>
		<p class="mb-2 text-sm font-medium">
			{title}
			<span class="ml-1 text-muted-foreground font-normal">{products.length}</span>
		</p>
		<div class="rounded-md border border-border overflow-hidden">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Producto</Table.Head>
						<Table.Head class="text-right">Uds.</Table.Head>
						<Table.Head class="text-right">Total</Table.Head>
						<Table.Head class="text-right">Efectivo</Table.Head>
						<Table.Head class="text-right">Tarjeta</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if hasCostCenters}
						{#each grouped as group}
							<Table.Row class="bg-muted/50 font-semibold">
								<Table.Cell class="text-xs uppercase tracking-wider">
									{group.name || "Sin asignar"}
								</Table.Cell>
								<Table.Cell class="text-right tabular-nums">{group.totalQty}</Table.Cell>
								<Table.Cell class="text-right tabular-nums">{fmt(group.totalGross)}</Table.Cell>
								<Table.Cell class="text-right tabular-nums">{fmt(group.totalCash)}</Table.Cell>
								<Table.Cell class="text-right tabular-nums">{fmt(group.totalCard)}</Table.Cell>
							</Table.Row>
							{#each group.rows as row}
								<Table.Row>
									<Table.Cell class="pl-8 text-sm">{row.product_name}</Table.Cell>
									<Table.Cell class="text-right tabular-nums text-sm">{row.unit === "weight" ? parseFloat(String(row.quantity)).toFixed(3) : row.quantity}</Table.Cell>
									<Table.Cell class="text-right tabular-nums text-sm">{fmt(row.total_gross)}</Table.Cell>
									<Table.Cell class="text-right tabular-nums text-sm">{fmt(row.cash_gross)}</Table.Cell>
									<Table.Cell class="text-right tabular-nums text-sm">{fmt(row.card_gross)}</Table.Cell>
								</Table.Row>
							{/each}
						{/each}
					{:else}
						{#each products as row}
							<Table.Row>
								<Table.Cell class="text-sm">{row.product_name}</Table.Cell>
								<Table.Cell class="text-right tabular-nums text-sm">{row.unit === "weight" ? parseFloat(String(row.quantity)).toFixed(3) : row.quantity}</Table.Cell>
								<Table.Cell class="text-right tabular-nums text-sm">{fmt(row.total_gross)}</Table.Cell>
								<Table.Cell class="text-right tabular-nums text-sm">{fmt(row.cash_gross)}</Table.Cell>
								<Table.Cell class="text-right tabular-nums text-sm">{fmt(row.card_gross)}</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
{/if}
