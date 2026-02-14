<script lang="ts">
  import { onMount } from "svelte";
  import { stockEditProduct, setStock } from "../stores/productStore";
  import type { Product } from "../types/shop";
  import { X, Plus, Minus, Package } from "lucide-svelte";

  let isOpen = $state(false);
  let isVisible = $state(false);
  let product = $state<Product | null>(null);
  let inputValue = $state("");
  let saving = $state(false);
  let errorMsg = $state("");
  let trackStock = $state(true);

  let currentStock = $derived(
    inputValue === "" ? null : parseInt(inputValue, 10),
  );
  let isValid = $derived(
    !trackStock || (inputValue !== "" && !isNaN(currentStock!) && currentStock! >= 0),
  );

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

  function closeModal() {
    stockEditProduct.set(null);
  }

  function appendDigit(digit: string) {
    if (!trackStock) return;
    if (inputValue === "0" && digit !== "0") {
      inputValue = digit;
    } else if (inputValue === "0" && digit === "0") {
      // keep "0"
    } else {
      inputValue += digit;
    }
  }

  function clearInput() {
    inputValue = "";
  }

  function backspace() {
    inputValue = inputValue.slice(0, -1);
  }

  function increment() {
    if (!trackStock) return;
    const val = inputValue === "" ? 0 : parseInt(inputValue, 10);
    if (!isNaN(val)) {
      inputValue = String(val + 1);
    }
  }

  function decrement() {
    if (!trackStock) return;
    const val = inputValue === "" ? 0 : parseInt(inputValue, 10);
    if (!isNaN(val) && val > 0) {
      inputValue = String(val - 1);
    }
  }

  async function save() {
    if (saving || !product) return;
    saving = true;
    errorMsg = "";

    try {
      const stockValue = trackStock ? (currentStock ?? 0) : null;
      await setStock(product.id, stockValue);
      closeModal();
    } catch (e: any) {
      errorMsg = e.message || "Error al guardar";
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    return stockEditProduct.subscribe((p) => {
      if (p) {
        product = p;
        trackStock = typeof p.stock === "number";
        inputValue = typeof p.stock === "number" ? String(p.stock) : "";
        errorMsg = "";
        saving = false;
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
    onkeydown={(e) => e.key === "Escape" && closeModal()}
  >
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onclick={closeModal}
    ></div>

    <!-- Modal -->
    <div
      class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden transition-transform duration-300 {isVisible ? 'scale-100' : 'scale-95'}"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Package class="w-5 h-5 text-blue-600" />
          </div>
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-zinc-800 truncate">Stock</h2>
            <p class="text-xs text-zinc-500 truncate">{product?.name ?? ""}</p>
          </div>
        </div>
        <button
          class="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          onclick={closeModal}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 space-y-4">
        <!-- Track stock toggle -->
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={trackStock}
            class="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-zinc-700">Controlar stock</span>
        </label>

        {#if trackStock}
          <!-- Display -->
          <div class="flex items-center gap-3">
            <button
              class="w-14 h-14 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 active:bg-zinc-300 transition-colors disabled:opacity-30"
              onclick={decrement}
              disabled={!trackStock || currentStock === 0 || inputValue === ""}
            >
              <Minus class="w-6 h-6" />
            </button>
            <div
              class="flex-1 h-14 rounded-xl bg-zinc-50 border-2 border-zinc-200 flex items-center justify-center text-2xl font-bold text-zinc-800 tabular-nums"
            >
              {inputValue === "" ? "—" : inputValue}
            </div>
            <button
              class="w-14 h-14 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 active:bg-zinc-300 transition-colors"
              onclick={increment}
            >
              <Plus class="w-6 h-6" />
            </button>
          </div>

          <!-- Numpad -->
          <div class="grid grid-cols-3 gap-2">
            {#each ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as digit}
              <button
                class="h-12 rounded-xl bg-zinc-50 border border-zinc-200 text-lg font-semibold text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
                onclick={() => appendDigit(digit)}
              >
                {digit}
              </button>
            {/each}
            <button
              class="h-12 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
              onclick={clearInput}
            >
              C
            </button>
            <button
              class="h-12 rounded-xl bg-zinc-50 border border-zinc-200 text-lg font-semibold text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
              onclick={() => appendDigit("0")}
            >
              0
            </button>
            <button
              class="h-12 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
              onclick={backspace}
            >
              ←
            </button>
          </div>
        {:else}
          <p class="text-sm text-zinc-400 text-center py-4">
            El stock no se controlará para este producto.
          </p>
        {/if}

        {#if errorMsg}
          <p class="text-sm text-red-600 text-center">{errorMsg}</p>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-5 pb-5 flex gap-3">
        <button
          class="flex-1 h-12 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
          onclick={closeModal}
        >
          Cancelar
        </button>
        <button
          class="flex-1 h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
          onclick={save}
          disabled={saving || (trackStock && !isValid)}
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  </div>
{/if}
