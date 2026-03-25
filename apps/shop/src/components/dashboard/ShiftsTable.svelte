<script lang="ts">
	import type { AggregatedReport } from "@pulpo/cms";
	import * as Table from "$lib/components/ui/table/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import ProductBreakdownTable from "./ProductBreakdownTable.svelte";
	import ChevronDown from "lucide-svelte/icons/chevron-down";

	let { shifts }: { shifts: AggregatedReport["shifts"] } = $props();

	let expandedIds = $state<Set<string>>(new Set());

	// Auto-expand if single shift
	$effect(() => {
		if (shifts.length === 1) {
			expandedIds = new Set([shifts[0].id]);
		}
	});

	function toggle(id: string) {
		const next = new Set(expandedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedIds = next;
	}

	function fmt(v: string | number): string {
		const n = typeof v === "string" ? parseFloat(v) : v;
		return n.toLocaleString("es-ES", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	}

	function fmtTime(iso: string): string {
		return new Date(iso).toLocaleTimeString("es-ES", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}
</script>

{#if shifts.length > 0}
	<div>
		<p class="mb-2 text-sm font-medium">
			Turnos
			<span class="ml-1 text-muted-foreground font-normal">{shifts.length}</span>
		</p>
		<div class="rounded-md border border-border overflow-hidden">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-12"></Table.Head>
						<Table.Head>Horario</Table.Head>
						<Table.Head class="text-right">Trans.</Table.Head>
						<Table.Head class="text-right">Bruto</Table.Head>
						<Table.Head class="text-right">Efectivo</Table.Head>
						<Table.Head class="text-right">Tarjeta</Table.Head>
						<Table.Head class="text-right">Dif.</Table.Head>
						<Table.Head class="w-8"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each shifts as shift, i (shift.id)}
						{@const counts = shift.invoice_counts}
						{@const isExpanded = expandedIds.has(shift.id)}
						<Table.Row
							class="cursor-pointer hover:bg-muted/50"
							onclick={() => toggle(shift.id)}
						>
							<Table.Cell class="font-bold text-muted-foreground">
								T{shifts.length - i}
							</Table.Cell>
							<Table.Cell class="tabular-nums text-sm">
								{fmtTime(shift.period_start)}–{shift.period_end ? fmtTime(shift.period_end) : "..."}
							</Table.Cell>
							<Table.Cell class="text-right">
								<span class="font-bold tabular-nums">{shift.transaction_count}</span>
								<span class="ml-1 text-xs text-muted-foreground">
									{counts.tickets}t {counts.facturas}f
									{#if counts.rectificativas > 0}
										<span class="text-destructive">{counts.rectificativas}r</span>
									{/if}
								</span>
							</Table.Cell>
							<Table.Cell class="text-right font-bold tabular-nums text-sm">
								{fmt(shift.total_gross)}
							</Table.Cell>
							<Table.Cell class="text-right tabular-nums text-sm">
								{fmt(shift.total_cash)}
							</Table.Cell>
							<Table.Cell class="text-right tabular-nums text-sm">
								{fmt(shift.total_card)}
							</Table.Cell>
							<Table.Cell class="text-right tabular-nums text-sm">
								{#if shift.difference !== null}
									{@const diff = parseFloat(shift.difference)}
									<span class="{Math.abs(diff) < 0.005 ? 'text-muted-foreground' : diff > 0 ? 'text-green-600' : 'text-destructive'} font-bold">
										{diff >= 0 ? "+" : ""}{fmt(diff)}
									</span>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<ChevronDown class="size-4 text-muted-foreground transition-transform {isExpanded ? 'rotate-180' : ''}" />
							</Table.Cell>
						</Table.Row>
						{#if isExpanded}
							<Table.Row>
								<Table.Cell colspan={8} class="p-4 bg-muted/30">
									{#if shift.product_breakdown.length > 0}
										<ProductBreakdownTable
											products={shift.product_breakdown}
											title="Productos del turno"
										/>
									{:else}
										<p class="text-sm text-muted-foreground text-center py-2">
											Sin productos
										</p>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/if}
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
{/if}
