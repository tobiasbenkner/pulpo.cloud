<script lang="ts">
  import type { Table } from "../../lib/types";

  export let tables: Table[] = [];
  export let editing = false;
  export let activeGroupId: string | null = null;
  export let selectedId: string | null = null;
  export let showGroupPanel = false;
  export let activeGroupTables: Set<string> = new Set();
  export let activeGroupColor: string = "#6366f1";

  export let onStartDrag: (e: MouseEvent | TouchEvent, table: Table) => void = () => {};
  export let onDrag: (e: MouseEvent | TouchEvent) => void = () => {};
  export let onEndDrag: () => void = () => {};
  export let onSelectTable: (id: string) => void = () => {};

  const TABLE_RADIUS = 5;
  const UNIT = 6;
  const GAP = 0.5;

  function tableRect(table: Table) {
    const w = table.width || 1;
    const totalW = w * UNIT + (w - 1) * GAP;
    const rot = table.rotation || 0;
    const v = rot === 90 || rot === 270;
    return { w: v ? UNIT : totalW, h: v ? totalW : UNIT, unitCount: w, rotation: rot, rawW: totalW, rawH: UNIT };
  }

  function getStyle(table: Table) {
    const isSelected = editing && !activeGroupId && !showGroupPanel && selectedId === table.id;
    const isInActiveGroup = activeGroupId && activeGroupTables.has(table.id);

    if (isSelected) return { fill: "var(--btn-primary-bg)", stroke: "var(--btn-primary-bg)", strokeW: "0.3", textColor: "var(--btn-primary-bg)" };
    if (activeGroupId && isInActiveGroup) return { fill: activeGroupColor + "25", stroke: activeGroupColor, strokeW: "0.6", textColor: activeGroupColor };
    return { fill: "var(--surface)", stroke: "var(--border-default)", strokeW: "0.3", textColor: "var(--fg-secondary)" };
  }

  let svgRef: SVGSVGElement;
</script>

<div class="w-full h-full bg-surface-alt border border-border-default rounded-lg overflow-hidden relative">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg bind:this={svgRef} viewBox="0 0 100 100" class="floorplan-svg w-full h-full select-none"
    style="touch-action: none; -webkit-tap-highlight-color: transparent;"
    on:mousemove={onDrag} on:mouseup={onEndDrag} on:mouseleave={onEndDrag}
    on:touchmove={onDrag} on:touchend={onEndDrag}>
    {#each Array(9) as _, i}
      <line x1={(i+1)*10} y1="0" x2={(i+1)*10} y2="100" stroke="var(--border-light)" stroke-width="0.15" />
      <line x1="0" y1={(i+1)*10} x2="100" y2={(i+1)*10} stroke="var(--border-light)" stroke-width="0.15" />
    {/each}

    {#each tables as table (table.id)}
      {@const ts = getStyle(table)}
      {@const tr = tableRect(table)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <g on:mousedown={(e) => onStartDrag(e, table)} on:touchstart={(e) => onStartDrag(e, table)}
        on:click|stopPropagation={() => onSelectTable(table.id)} on:keydown={() => {}}
        class={editing ? (activeGroupId ? "cursor-pointer" : "cursor-grab active:cursor-grabbing") : "cursor-default"}
        style="outline: none; -webkit-tap-highlight-color: transparent;">
        {#if table.shape === "round"}
          <circle cx={table.x} cy={table.y} r={TABLE_RADIUS} fill={ts.fill} stroke={ts.stroke} stroke-width={ts.strokeW} />
        {:else}
          <g transform="rotate({tr.rotation}, {table.x}, {table.y})">
            {#each Array(tr.unitCount) as _, i}
              <rect x={table.x - tr.rawW/2 + i*(UNIT+GAP)} y={table.y - tr.rawH/2} width={UNIT} height={UNIT} rx="0.4"
                fill={ts.fill} stroke={ts.stroke} stroke-width={ts.strokeW} />
            {/each}
          </g>
        {/if}
        <text x={table.x} y={table.y + tr.h/2 + 2.5} text-anchor="middle" dominant-baseline="central"
          font-size="2.2" font-weight="500" fill={ts.textColor}>
          {table.label} · {table.seats}p
        </text>
      </g>
    {/each}
  </svg>

  {#if tables.length === 0}
    <div class="absolute inset-0 flex flex-col items-center justify-center text-fg-muted pointer-events-none">
      <slot name="empty" />
    </div>
  {/if}
</div>
