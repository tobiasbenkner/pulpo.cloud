<script lang="ts">
	import { Calendar } from "$lib/components/ui/calendar/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import CalendarIcon from "lucide-svelte/icons/calendar";
	import {
		CalendarDate,
		type DateValue,
		getLocalTimeZone,
	} from "@internationalized/date";

	let {
		value = $bindable(""),
		label = "",
		placeholder = "Seleccionar fecha",
	}: {
		value: string;
		label?: string;
		placeholder?: string;
	} = $props();

	let open = $state(false);

	// Convert string "YYYY-MM-DD" to DateValue
	let dateValue: DateValue | undefined = $derived.by(() => {
		if (!value) return undefined;
		const [y, m, d] = value.split("-").map(Number);
		if (!y || !m || !d) return undefined;
		return new CalendarDate(y, m, d);
	});

	function onValueChange(v: DateValue | undefined) {
		if (!v) {
			value = "";
		} else {
			const y = String(v.year).padStart(4, "0");
			const m = String(v.month).padStart(2, "0");
			const d = String(v.day).padStart(2, "0");
			value = `${y}-${m}-${d}`;
		}
		open = false;
	}

	function formatDisplay(v: string): string {
		if (!v) return placeholder;
		const [y, m, d] = v.split("-").map(Number);
		const date = new Date(y, m - 1, d);
		return date.toLocaleDateString("es-ES", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	}
</script>

{#if label}
	<span class="text-xs text-muted-foreground">{label}</span>
{/if}
<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				variant="outline"
				class="h-9 w-[160px] justify-start text-left text-sm font-normal {!value ? 'text-muted-foreground' : ''}"
				{...props}
			>
				<CalendarIcon class="mr-2 size-4" />
				{formatDisplay(value)}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0" align="start">
		<Calendar
			type="single"
			value={dateValue}
			onValueChange={onValueChange}
			locale="es-ES"
		/>
	</Popover.Content>
</Popover.Root>
