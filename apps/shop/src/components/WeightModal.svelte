<script lang="ts">
  import { onMount } from "svelte";
  import {
    isWeightModalOpen,
    addToCartWithWeight,
    removeFromCart,
    setItemQuantity,
    cartItems,
  } from "../stores/cartStore";
  import type { Product } from "../types/shop";
  import { X } from "lucide-svelte";

  let isOpen = $state(false);
  let isVisible = $state(false);
  let product = $state<Product | null>(null);
  let inputBuffer = $state("");
  let isEditing = $state(false);

  let grams = $derived(inputBuffer === "" ? 0 : parseInt(inputBuffer));
  let kgDisplay = $derived((grams / 1000).toFixed(3));
  let canConfirm = $derived(grams > 0);

  function openModalAnim() {
    isOpen = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isVisible = true;
      });
    });
  }

  function hideModalAnim() {
    isVisible = false;
    setTimeout(() => {
      isOpen = false;
    }, 300);
  }

  function close() {
    isWeightModalOpen.set({ product: null });
  }

  function appendDigit(digit: string) {
    if (inputBuffer === "0" && digit !== "0") {
      inputBuffer = digit;
    } else if (inputBuffer === "0" && digit === "0") {
      // keep "0"
    } else if (inputBuffer.length < 5) {
      inputBuffer += digit;
    }
  }

  function setQuick(g: number) {
    inputBuffer = g.toString();
  }

  function clearInput() {
    inputBuffer = "";
  }

  function backspace() {
    inputBuffer = inputBuffer.slice(0, -1);
  }

  function confirm() {
    if (!product || !canConfirm) return;
    const kg = grams / 1000;

    if (isEditing) {
      setItemQuantity(product.id, kg);
    } else {
      addToCartWithWeight(product, kg);
    }

    close();
  }

  function remove() {
    if (product) {
      removeFromCart(product.id);
      close();
    }
  }

  onMount(() => {
    return isWeightModalOpen.subscribe((state) => {
      if (state.product) {
        product = state.product;

        const existing = cartItems.get()[state.product.id];
        if (existing) {
          isEditing = true;
          inputBuffer = Math.round(existing.quantity * 1000).toString();
        } else {
          isEditing = false;
          inputBuffer = "";
        }

        openModalAnim();
      } else {
        hideModalAnim();
      }
    });
  });
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-300 {isVisible ? 'opacity-100' : 'opacity-0'}"
    onkeydown={(e) => e.key === "Escape" && close()}
  >
    <!-- Backdrop -->
    <button
      type="button"
      class="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onclick={close}
      aria-label="Cerrar"
    ></button>

    <!-- Modal -->
    <div
      class="relative bg-white rounded-3xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden transition-transform duration-300 {isVisible ? 'scale-100' : 'scale-95'}"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4">
        <div class="min-w-0">
          <h2 class="text-xl font-bold text-zinc-900">Peso</h2>
          <p class="text-sm text-zinc-400 truncate">{product?.name ?? ""}</p>
        </div>
        <button
          class="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          onclick={close}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="px-5 pb-5 space-y-3">
        <!-- Display -->
        <div
          class="bg-zinc-900 rounded-2xl p-4 text-center shadow-inner flex flex-col justify-center"
        >
          <span class="text-zinc-400 text-[10px] font-medium uppercase tracking-wider mb-0.5">
            Gramos
          </span>
          <div class="flex items-baseline justify-center gap-1">
            <span class="text-5xl font-mono tracking-tight font-bold text-white">
              {grams}
            </span>
            <span class="text-xl text-zinc-500 font-medium">g</span>
          </div>
          <div class="text-sm text-zinc-500 font-mono mt-1">
            {kgDisplay} kg
          </div>
        </div>

        <!-- Quick weight buttons -->
        <div class="grid grid-cols-4 gap-2 select-none">
          {#each [{ g: 100, label: "100g" }, { g: 250, label: "250g" }, { g: 500, label: "500g" }, { g: 1000, label: "1kg" }] as btn}
            <button
              class="bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold py-2 rounded-xl hover:bg-blue-100 active:scale-95 transition-colors"
              onclick={() => setQuick(btn.g)}
            >
              {btn.label}
            </button>
          {/each}
        </div>

        <!-- Numpad -->
        <div class="grid grid-cols-3 gap-2 select-none">
          {#each ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as digit}
            <button
              class="h-12 rounded-xl bg-white border border-zinc-200 text-xl font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 active:scale-95 transition-colors shadow-sm"
              onclick={() => appendDigit(digit)}
            >
              {digit}
            </button>
          {/each}
          <button
            class="h-12 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
            onclick={backspace}
          >
            &#8592;
          </button>
          <button
            class="h-12 rounded-xl bg-white border border-zinc-200 text-xl font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 active:scale-95 transition-colors shadow-sm"
            onclick={() => appendDigit("0")}
          >
            0
          </button>
          <button
            class="h-12 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold hover:bg-red-100 active:scale-95 transition-colors"
            onclick={clearInput}
          >
            C
          </button>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-1">
          <button
            class="flex-1 py-3.5 text-red-500 font-bold text-sm border border-red-100 rounded-xl hover:bg-red-50 active:scale-95 transition-colors"
            onclick={remove}
          >
            Eliminar
          </button>
          <button
            class="flex-[2] py-3.5 bg-zinc-900 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-black active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={!canConfirm}
            onclick={confirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
