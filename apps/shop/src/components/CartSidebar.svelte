<script lang="ts">
  import { onMount } from "svelte";
  import {
    cartItems,
    cartTotals,
    isPaymentModalOpen,
    isDiscountModalOpen,
    isCustomerModalOpen,
    isCustomAmountOpen,
    customerModalMode,
    globalDiscount,
    selectedCustomer,
    setCustomer,
    addToCart,
    decreaseQuantity,
    parkCurrentCart,
    restoreParkedCart,
    parkedCarts,
    deleteParkedCart,
    isQuantityModalOpen,
  } from "../stores/cartStore";
  import { isRegisterOpen } from "../stores/registerStore";
  import { taxName } from "../stores/taxStore";
  import type { CartItem, CartTotals, Customer } from "../types/shop";
  import type { ParkedCart } from "../stores/cartStore";
  import Big from "big.js";
  import LastChangeWidget from "./LastChangeWidget.svelte";
  import { SquareParking, UserRound, Plus, X as XIcon } from "lucide-svelte";

  let items = $state<Record<string, CartItem>>({});
  let totals = $state<CartTotals>({
    subtotal: "0.00",
    discountTotal: "0.00",
    gross: "0.00",
    net: "0.00",
    tax: "0.00",
    taxBreakdown: [],
    items: [],
    count: 0,
    discountType: null,
    discountValue: null,
  });
  let parked = $state<Record<string, ParkedCart>>({});
  let discount = $state<{ type: "percent" | "fixed"; value: number } | null>(
    null,
  );
  let registerOpen = $state(false);
  let customer = $state<Customer | null>(null);
  let showParked = $state(false);
  let scrollTop = $state(0);
  let tax = $state("IGIC");

  let entries = $derived(Object.entries(items));
  let parkedIds = $derived(Object.keys(parked));
  let hasDiscount = $derived(discount !== null);

  onMount(() => {
    const unsubs = [
      cartItems.subscribe((v) => (items = v)),
      cartTotals.subscribe((v) => (totals = v)),
      parkedCarts.subscribe((v) => {
        parked = v;
        if (Object.keys(v).length === 0) showParked = false;
      }),
      globalDiscount.subscribe((v) => (discount = v)),
      selectedCustomer.subscribe((v) => (customer = v)),
      isRegisterOpen.subscribe((v) => (registerOpen = v)),
      taxName.subscribe((v) => (tax = v)),
    ];
    return () => unsubs.forEach((u) => u());
  });

  function handlePark() {
    if (Object.keys(items).length > 0) parkCurrentCart();
  }

  function handleRestore(id: string) {
    restoreParkedCart(id);
    showParked = false;
  }

  function handleScroll(e: Event) {
    scrollTop = (e.target as HTMLElement).scrollTop;
  }

  function itemPriceInfo(item: CartItem) {
    const originalPriceTotal = new Big(item.priceGross).times(item.quantity);
    let finalPriceTotal = originalPriceTotal;
    let discountLabel = "";
    if (item.discount) {
      if (item.discount.type === "percent") {
        discountLabel = `-${item.discount.value}%`;
        finalPriceTotal = originalPriceTotal.times(
          new Big(1).minus(new Big(item.discount.value).div(100)),
        );
      } else {
        discountLabel = `-${new Big(item.discount.value).toFixed(2)}\u20AC`;
        const discounted = originalPriceTotal.minus(item.discount.value);
        finalPriceTotal = discounted.lt(0) ? new Big(0) : discounted;
      }
    }
    return {
      originalPriceTotal: originalPriceTotal.toFixed(2),
      finalPriceTotal: finalPriceTotal.toFixed(2),
      discountLabel,
      hasDiscount: !!item.discount,
    };
  }

  function formatTaxRate(rate: string): string {
    return new Big(rate).times(100).toFixed(1).replace(".0", "");
  }
</script>

{#if !registerOpen}
  <aside
    class="flex flex-col h-full w-full bg-white shadow-2xl z-20 border-l border-zinc-200 overflow-hidden relative items-center justify-center text-zinc-300 select-none"
  >
    <svg
      class="w-12 h-12 mb-2 opacity-50"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
    <span class="text-xs font-medium">Caja cerrada</span>
  </aside>
{:else}
  <aside
    class="flex flex-col h-full w-full bg-white shadow-2xl z-20 border-l border-zinc-200 overflow-hidden relative"
  >
    <!-- === HEADER === -->
    <div
      class="flex-none flex flex-col gap-3 px-4 py-4 border-b border-zinc-100 bg-white z-20 relative"
    >
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <h2 class="text-base font-bold text-zinc-900 tracking-tight">
            Pedido
          </h2>
          <span
            class="text-zinc-400 text-[10px] font-bold bg-zinc-100 px-2 py-0.5 rounded-full uppercase tracking-wide"
          >
            {totals.count} Líns.
          </span>
        </div>

        <div class="flex items-center gap-1">
          <button
            class="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group relative"
            title="Aparcar pedido"
            onclick={handlePark}
          >
            <SquareParking class="w-5 h-5" />
          </button>

          {#if parkedIds.length > 0}
            <button
              class="relative p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
              title="Pedidos aparcados"
              onclick={() => (showParked = !showParked)}
            >
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span class="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"
                ></span>
                <span
                  class="relative inline-flex rounded-full h-2 w-2 bg-orange-500"
                ></span>
              </span>
            </button>
          {/if}
        </div>
      </div>
      <LastChangeWidget />
    </div>

    <!-- === OVERLAY: PEDIDOS APARCADOS === -->
    {#if showParked}
      <div
        class="absolute inset-0 top-[130px] z-30 bg-zinc-50/95 backdrop-blur-sm p-3 flex flex-col gap-3 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-200"
      >
        <div
          class="flex justify-between items-center mb-1 border-b border-zinc-200 pb-2"
        >
          <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Lista de espera
          </h3>
          <button
            class="p-1 text-zinc-400 hover:text-zinc-600"
            onclick={() => (showParked = false)}
            aria-label="Cerrar lista de espera"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div class="space-y-2 pb-10">
          {#each parkedIds as id (id)}
            {@const cart = parked[id]}
            <div
              class="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center group hover:border-blue-300 transition-colors cursor-pointer"
              role="button"
              tabindex="0"
              onclick={(e) => {
                if (
                  !(e.target instanceof HTMLElement) ||
                  !e.target.closest("button")
                ) {
                  handleRestore(id);
                }
              }}
              onkeydown={(e) => {
                if (e.key === "Enter") handleRestore(id);
              }}
            >
              <div class="flex-1">
                <div class="font-bold text-zinc-800 text-sm mb-0.5">
                  {cart.customerName}
                </div>
                <div
                  class="text-xs text-zinc-500 font-mono flex items-center gap-2"
                >
                  <span
                    class="bg-zinc-100 px-1.5 rounded text-zinc-600 border border-zinc-100"
                    >{cart.total} &euro;</span
                  >
                  <span
                    >{new Date(cart.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}</span
                  >
                </div>
              </div>
              <button
                onclick={() => deleteParkedCart(id)}
                class="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10 relative"
                aria-label="Eliminar carrito"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- === LISTA === -->
    <div class="flex-1 min-h-0 relative bg-white group">
      <div
        class="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none transition-opacity duration-300 {scrollTop >
        10
          ? 'opacity-100'
          : 'opacity-0'}"
      ></div>
      <div
        class="absolute inset-0 overflow-y-auto divide-y divide-zinc-100 scroll-smooth pb-2"
        onscroll={handleScroll}
      >
        {#if entries.length === 0}
          <div
            class="h-full flex flex-col items-center justify-center text-zinc-300 gap-2 opacity-50 select-none"
          >
            <svg
              class="w-10 h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span class="text-xs font-medium">Vacío</span>
          </div>
        {:else}
          {#each entries as [id, item] (id)}
            {@const info = itemPriceInfo(item)}
            <div
              class="flex items-center justify-between p-3 hover:bg-zinc-50 transition-colors group animate-in fade-in slide-in-from-right-2 duration-200 select-none"
            >
              <div class="flex-1 min-w-0 pr-3">
                <h4
                  class="font-semibold text-zinc-800 text-sm leading-tight truncate mb-0.5"
                  title={item.name}
                >
                  {item.name}
                </h4>
                <div class="flex items-center gap-2">
                  <p class="text-[10px] text-zinc-400 font-medium">
                    {new Big(item.priceGross).toFixed(2)} &euro;/u.
                  </p>
                  <button
                    onclick={() => isDiscountModalOpen.set({ itemId: id })}
                    class="text-[9px] px-1.5 py-0.5 rounded-md font-bold transition-colors {info.hasDiscount
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-zinc-200'}"
                  >
                    {info.hasDiscount ? info.discountLabel : "+ Descuento"}
                  </button>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <div class="flex flex-col items-end leading-none mb-1">
                  {#if info.hasDiscount}
                    <span class="text-[10px] text-zinc-400 line-through mb-0.5"
                      >{info.originalPriceTotal} &euro;</span
                    >
                  {/if}
                  <span
                    class="font-bold {info.hasDiscount
                      ? 'text-orange-600'
                      : 'text-zinc-900'} text-sm tabular-nums tracking-tight"
                  >
                    {info.finalPriceTotal} &euro;
                  </span>
                </div>
                <div
                  class="flex items-center bg-white rounded-lg border border-zinc-200 shadow-sm h-9"
                >
                  <button
                    class="w-10 h-full flex items-center justify-center rounded-l-lg transition-colors border-r border-zinc-100 active:bg-zinc-200 {item.quantity ===
                    1
                      ? 'text-red-500 hover:bg-red-50'
                      : 'text-zinc-500 hover:bg-zinc-100'}"
                    onclick={() => decreaseQuantity(id)}
                  >
                    {#if item.quantity === 1}
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    {:else}
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2.5"
                          d="M20 12H4"
                        />
                      </svg>
                    {/if}
                  </button>
                  <button
                    onclick={() => isQuantityModalOpen.set({ itemId: id })}
                    class="w-10 h-full text-center font-bold text-sm text-zinc-900 tabular-nums hover:bg-zinc-50 hover:text-blue-600 transition-colors"
                    title="Cambiar cantidad"
                  >
                    {item.quantity}
                  </button>
                  <button
                    class="w-10 h-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 rounded-r-lg transition-colors border-l border-zinc-100 active:bg-zinc-200"
                    onclick={() => addToCart(item)}
                    aria-label="Añadir uno más"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2.5"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
      <div
        class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-50 to-transparent z-10 pointer-events-none"
      ></div>
    </div>

    <!-- === FOOTER === -->
    <div
      class="flex-none p-4 bg-zinc-50 border-t border-zinc-200 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] z-20 relative"
    >
      <!-- 1. Bereich: Zahlen & Fakten -->
      <div class="space-y-1 mb-4">
        {#if hasDiscount}
          <!-- Zwischensumme -->
          <div class="flex justify-between text-zinc-400 text-sm pb-1">
            <span>Subtotal</span>
            <span class="font-medium">{totals.subtotal} &euro;</span>
          </div>

          <!-- Rabatt Wert -->
          <div
            class="flex justify-between text-orange-600 text-sm font-bold border-b border-zinc-200/50 pb-2 mb-2"
          >
            <span class="flex items-center gap-1">
              Descuento total
              {#if discount?.type === "percent"}
                <span
                  class="text-[10px] bg-orange-100 px-1 rounded ml-1 font-normal"
                  >{discount.value}%</span
                >
              {/if}
            </span>
            <span>-{totals.discountTotal} &euro;</span>
          </div>
        {/if}

        <!-- Steuer-Aufschl\u00FCsselung -->
        <div class="space-y-0.5">
          {#each totals.taxBreakdown as entry (entry.rate)}
            <div
              class="flex justify-between text-zinc-400 text-[10px] uppercase tracking-wide"
            >
              <span>{tax} {formatTaxRate(entry.rate)}%</span>
              <span class="font-mono">{entry.amount} &euro;</span>
            </div>
          {/each}
        </div>

        <!-- TOTAL GROSS -->
        <div
          class="pt-3 border-t border-zinc-200 flex justify-between items-baseline mt-2"
        >
          <span class="text-zinc-900 font-bold text-xl">Total</span>
          <span
            class="text-3xl font-extrabold text-zinc-900 tracking-tight leading-none"
            >{totals.gross} &euro;</span
          >
        </div>
      </div>

      <!-- 2. Bereich: Gro\u00DFe Buttons -->
      <div class="flex flex-col gap-3">
        <!-- Descuento + Importe libre -->
        <div class="flex gap-2">
          <button
            onclick={() => isDiscountModalOpen.set({ itemId: "GLOBAL" })}
            class="flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] {hasDiscount
              ? 'border-solid border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
              : 'border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-800'}"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span>{hasDiscount ? "Descuento" : "Descuento"}</span>
          </button>
          <button
            class="flex-1 py-3 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            onclick={() => isCustomAmountOpen.set(true)}
          >
            <Plus class="w-4 h-4" />
            <span>Libre</span>
          </button>
        </div>

        <!-- Kunde -->
        <button
          class="w-full py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] {customer
            ? 'border-solid border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            : 'border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-800'}"
          onclick={() => {
            customerModalMode.set("select");
            isCustomerModalOpen.set(true);
          }}
        >
          <UserRound class="w-4 h-4" />
          <span class="truncate">
            {customer ? customer.name : "Cliente"}
          </span>
          {#if customer}
            <button
              class="ml-1 p-0.5 rounded-full hover:bg-blue-200 transition-colors"
              onclick={(e) => {
                e.stopPropagation();
                setCustomer(null);
              }}
              title="Quitar cliente"
            >
              <XIcon class="w-5 h-5" />
            </button>
          {/if}
        </button>

        <!-- Checkout Button -->
        <button
          class="w-full bg-zinc-900 text-white font-medium text-lg py-4 rounded-xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-zinc-200"
          disabled={totals.count === 0}
          onclick={() => isPaymentModalOpen.set(true)}
        >
          Cobrar
        </button>
      </div>
    </div>
  </aside>
{/if}
