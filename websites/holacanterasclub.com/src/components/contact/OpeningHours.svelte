<script lang="ts">
  import { onMount } from "svelte";
  import type { OpeningHour } from "@pulpo/cms";

  interface Props {
    directusUrl: string;
    tenant: string;
    lang: string;
    label: string;
  }

  let { directusUrl, tenant, lang, label }: Props = $props();

  let hours = $state<OpeningHour[]>([]);
  let loading = $state(true);

  function reduceTranslations(
    trans: any[],
    fieldName: string,
  ): Record<string, string> {
    return (trans ?? []).reduce(
      (acc: Record<string, string>, t: any) => {
        acc[t.languages_id.code] = t[fieldName] ?? "";
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  async function fetchOpeningHours() {
    try {
      loading = true;

      const params = new URLSearchParams({
        "filter[tenant][_eq]": tenant,
        "sort[]": "sort",
      });
      params.append("fields[]", "*");
      params.append("fields[]", "translations.*");
      params.append("fields[]", "translations.languages_id.*");

      const response = await fetch(
        `${directusUrl}/items/opening_hours?${params}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch opening hours");
      }

      const data = await response.json();

      hours = (data.data || []).map(
        (item: any): OpeningHour => ({
          id: item.id,
          days_label: reduceTranslations(item.translations, "days_label"),
          hours_text: reduceTranslations(item.translations, "hours_text"),
          additional_info: reduceTranslations(
            item.translations,
            "additional_info",
          ),
        }),
      );
    } catch (err) {
      console.error("Error fetching opening hours:", err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchOpeningHours();
  });
</script>

<div
  class="group bg-background/50 rounded-xl p-5 border border-border hover:border-secondary/50 transition-all duration-300"
>
  <div class="flex items-center gap-3 mb-3">
    <div
      class="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors"
    >
      <svg
        class="w-4 h-4 text-secondary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <h3 class="text-base font-bold text-white">{label}</h3>
  </div>

  {#if loading}
    <div class="text-text-muted text-sm">...</div>
  {:else if hours.length === 0}
    <p class="text-text-muted text-sm">-</p>
  {:else}
    <div class="space-y-1">
      {#each hours as hour (hour.id)}
        <div class="text-sm">
          <span class="text-white font-medium">
            {hour.days_label[lang] || hour.days_label["es"]}:
          </span>
          <span class="text-text-muted">
            {hour.hours_text[lang] || hour.hours_text["es"]}
          </span>
          {#if hour.additional_info[lang] || hour.additional_info["es"]}
            <span class="text-secondary text-xs ml-1">
              ({hour.additional_info[lang] || hour.additional_info["es"]})
            </span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
