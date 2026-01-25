<script lang="ts">
  import { onMount } from "svelte";

  interface EventData {
    id: string;
    date: string;
    time: string;
    price: number;
    image: string | { id: string };
    title: string;
    description: string;
  }

  interface Props {
    directusUrl: string;
    directusToken: string;
    tenant: string;
    lang: string;
  }

  let { directusUrl, directusToken, tenant, lang }: Props = $props();

  let events = $state<EventData[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  const translations = {
    es: {
      noEvents: "No hay eventos programados",
      noEventsDescription:
        "Estamos preparando algo especial. ¡Vuelve pronto para descubrir nuestros próximos eventos!",
      price: "Entrada",
      free: "Gratis",
      time: "Hora",
      loading: "Cargando eventos...",
      error: "Error al cargar los eventos",
    },
    en: {
      noEvents: "No events scheduled",
      noEventsDescription:
        "We're preparing something special. Come back soon to discover our upcoming events!",
      price: "Entry",
      free: "Free",
      time: "Time",
      loading: "Loading events...",
      error: "Error loading events",
    },
  };

  const t = $derived(
    translations[lang as keyof typeof translations] || translations.es,
  );

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
    };
    const formatted = date.toLocaleDateString(
      lang === "en" ? "en-US" : "es-ES",
      options,
    );
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  function getImageUrl(image: string | { id: string }): string {
    const imageId = typeof image === "string" ? image : image?.id;
    if (!imageId) return "";
    return `${directusUrl}/assets/${imageId}?width=800&access_token=${directusToken}`;
  }

  async function fetchEvents() {
    try {
      loading = true;
      error = null;

      const today = new Date().toISOString().split("T")[0];

      const params = new URLSearchParams({
        "filter[tenant][_eq]": tenant,
        "filter[date][_gte]": today,
        "sort[]": "date",
        "fields[]": "*",
        "fields[]": "image.*",
        "fields[]": "translations.*",
        "fields[]": "translations.languages_id.*",
      });

      const response = await fetch(`${directusUrl}/items/events?${params}`, {
        headers: {
          Authorization: `Bearer ${directusToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();

      events = (data.data || []).map((event: any) => {
        const translation =
          event.translations?.find((t: any) => t.languages_id?.code === lang) ||
          event.translations?.[0];

        return {
          id: event.id,
          date: event.date,
          time: event.time,
          price: event.price,
          image: event.image,
          title: translation?.title || "",
          description: translation?.content || "",
        };
      });
    } catch (err) {
      console.error("Error fetching events:", err);
      error = t.error;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchEvents();
  });
</script>

<div class="max-w-4xl mx-auto">
  {#if loading}
    <div class="flex flex-col items-center justify-center py-16">
      <div
        class="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-4"
      ></div>
      <p class="text-text-muted">{t.loading}</p>
    </div>
  {:else if error}
    <div class="text-center py-16">
      <div class="text-6xl mb-4">😕</div>
      <p class="text-text-muted text-lg">{error}</p>
    </div>
  {:else if events.length === 0}
    <div
      class="bg-background rounded-2xl border border-border p-8 md:p-12 text-center"
    >
      <div
        class="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary/10 flex items-center justify-center"
      >
        <span class="text-4xl">🎉</span>
      </div>
      <h3 class="text-2xl md:text-3xl font-bold text-white mb-4">
        {t.noEvents}
      </h3>
      <p class="text-text-muted text-lg max-w-md mx-auto">
        {t.noEventsDescription}
      </p>
    </div>
  {:else}
    <div class="space-y-6">
      {#each events as event, index (event.id)}
        <article
          class="group bg-background rounded-2xl overflow-hidden border border-border hover:border-secondary/50 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/5"
        >
          <div class="md:flex">
            {#if event.image}
              <div class="md:w-2/5 relative overflow-hidden">
                <img
                  src={getImageUrl(event.image)}
                  alt={event.title}
                  class="w-full h-48 md:h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent md:bg-gradient-to-r"
                ></div>
              </div>
            {/if}

            <div class="flex-1 p-6 md:p-8 flex flex-col justify-center">
              <div class="flex flex-wrap items-center gap-3 mb-4">
                <span
                  class="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-semibold"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDate(event.date)}
                </span>

                {#if event.time}
                  <span
                    class="inline-flex items-center gap-2 bg-white/5 text-text-muted px-3 py-2 rounded-full text-sm"
                  >
                    <svg
                      class="w-4 h-4"
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
                    {event.time}
                  </span>
                {/if}
              </div>

              <h3
                class="text-2xl md:text-3xl font-bold text-white mb-3 group-hover:text-secondary transition-colors"
              >
                {event.title}
              </h3>

              {#if event.description}
                <p
                  class="text-text-muted text-base md:text-lg leading-relaxed mb-4 line-clamp-3"
                >
                  {@html event.description}
                </p>
              {/if}

              <div
                class="flex items-center gap-4 mt-auto pt-4 border-t border-border/50"
              >
                <div class="flex items-center gap-2">
                  <span class="text-text-muted text-sm">{t.price}:</span>
                  <span class="text-secondary font-bold text-lg">
                    {event.price > 0 ? `${event.price}€` : t.free}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
