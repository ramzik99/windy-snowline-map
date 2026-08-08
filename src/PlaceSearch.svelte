<div class="place-search">
  <form on:submit|preventDefault={submitSearch} on:keydown|stopPropagation on:keyup|stopPropagation>
    <input
      bind:value={query}
      on:input={scheduleSearch}
      on:focus={() => { if (visibleResults.length || favourites.length) open = true; }}
      aria-label="Search places"
      placeholder="Search place or favourite…"
      autocomplete="off"
      spellcheck="false"
    />
    <button class="fav-button" type="button" aria-label="Show favourites" on:click={toggleFavourites}>
      ★
    </button>
    <button type="submit" aria-label="Search" disabled={searching || query.trim().length < 2}>
      {searching ? '…' : '⌕'}
    </button>
  </form>

  {#if open}
    <div class="results">
      {#if visibleResults.length}
        {#each visibleResults as result}
          <button class="result" type="button" on:click={() => chooseResult(result)}>
            <span class="result-main">{result.favourite ? '★ ' : ''}{result.primary}</span>
            {#if result.secondary}<span class="result-sub">{result.secondary}</span>{/if}
          </button>
        {/each}
        {#if remoteResults.length}<div class="credit">Search © OpenStreetMap contributors</div>{/if}
      {:else if !searching}
        <div class="empty">{showFavourites ? 'No favourites found' : 'No places found'}</div>
      {/if}
    </div>
  {/if}
</div>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import store from '@windy/store';

  type SearchResult = {
    lat: number;
    lon: number;
    primary: string;
    secondary: string;
    favourite: boolean;
  };

  const dispatch = createEventDispatcher<{ select: SearchResult }>();

  let query = '';
  let searching = false;
  let open = false;
  let showFavourites = false;
  let remoteResults: SearchResult[] = [];
  let favourites: SearchResult[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let requestId = 0;
  let favPoisListener: number | null = null;
  let favPoisMobileListener: number | null = null;

  $: favouriteMatches = query.trim()
    ? favourites.filter(item => `${item.primary} ${item.secondary}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5)
    : favourites.slice(0, 8);
  $: visibleResults = showFavourites
    ? favouriteMatches
    : [...favouriteMatches, ...remoteResults].slice(0, 8);

  function splitName(name: string): { primary: string; secondary: string } {
    const parts = name.split(',').map(part => part.trim()).filter(Boolean);
    return { primary: parts[0] || 'Favourite', secondary: parts.slice(1, 3).join(', ') };
  }

  function resultFromObject(value: any): SearchResult | null {
    if (!value || typeof value !== 'object') return null;
    const lat = Number(value.lat ?? value.latitude ?? value.y);
    const lon = Number(value.lon ?? value.lng ?? value.longitude ?? value.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const rawName = String(value.name ?? value.title ?? value.label ?? value.display_name ?? value.displayName ?? 'Favourite');
    const { primary, secondary } = splitName(rawName);
    return { lat, lon, primary, secondary, favourite: true };
  }

  function resultFromString(raw: string): SearchResult | null {
    const text = raw.trim();
    if (!text) return null;

    try {
      const parsed = JSON.parse(text);
      const fromJson = resultFromObject(parsed);
      if (fromJson) return fromJson;
    } catch {}

    const coordMatch = text.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,;| ]\s*(-?\d{1,3}(?:\.\d+)?)/);
    if (!coordMatch) return null;
    const lat = Number(coordMatch[1]), lon = Number(coordMatch[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

    const remainder = text.replace(coordMatch[0], '').replace(/^[\s,;|:-]+|[\s,;|:-]+$/g, '');
    const { primary, secondary } = splitName(remainder || 'Favourite');
    return { lat, lon, primary, secondary, favourite: true };
  }

  function parseFavouriteList(value: unknown): SearchResult[] {
    if (!Array.isArray(value)) return [];
    const out: SearchResult[] = [];
    for (const item of value) {
      const parsed = typeof item === 'string' ? resultFromString(item) : resultFromObject(item);
      if (parsed) out.push(parsed);
    }
    return out;
  }

  function refreshFavourites() {
    const merged: SearchResult[] = [];
    for (const key of ['favPois', 'favPoisMobile']) {
      try { merged.push(...parseFavouriteList(store.get(key as any))); } catch {}
    }
    const dedup = new Map<string, SearchResult>();
    for (const item of merged) dedup.set(`${item.lat.toFixed(5)},${item.lon.toFixed(5)}`, item);
    favourites = [...dedup.values()];
  }

  function scheduleSearch() {
    showFavourites = false;
    if (timer) clearTimeout(timer);
    controller?.abort();
    remoteResults = [];
    const q = query.trim();
    open = q.length >= 1 || favourites.length > 0;
    if (q.length < 2) { searching = false; return; }
    timer = setTimeout(() => runSearch(), 550);
  }

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++requestId;
    controller?.abort();
    controller = new AbortController();
    searching = true;
    open = true;
    try {
      const params = new URLSearchParams({ q, format: 'jsonv2', limit: '5', addressdetails: '0' });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (id === requestId) {
        remoteResults = Array.isArray(data) ? data.map((item: any) => {
          const lat = Number(item.lat), lon = Number(item.lon);
          const { primary, secondary } = splitName(String(item.display_name ?? 'Place'));
          return { lat, lon, primary, secondary, favourite: false };
        }).filter((item: SearchResult) => Number.isFinite(item.lat) && Number.isFinite(item.lon)) : [];
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.warn('Snowline place search failed', e);
      if (id === requestId) remoteResults = [];
    } finally {
      if (id === requestId) searching = false;
    }
  }

  function submitSearch() {
    if (timer) clearTimeout(timer);
    if (visibleResults.length === 1) chooseResult(visibleResults[0]);
    else runSearch();
  }

  function toggleFavourites() {
    showFavourites = !showFavourites;
    open = showFavourites || visibleResults.length > 0;
    if (showFavourites) {
      controller?.abort();
      remoteResults = [];
      searching = false;
    }
  }

  function chooseResult(result: SearchResult) {
    query = result.primary;
    open = false;
    showFavourites = false;
    remoteResults = [];
    dispatch('select', result);
  }

  onMount(() => {
    refreshFavourites();
    try { favPoisListener = store.on('favPois' as any, refreshFavourites); } catch {}
    try { favPoisMobileListener = store.on('favPoisMobile' as any, refreshFavourites); } catch {}
  });

  onDestroy(() => {
    if (timer) clearTimeout(timer);
    controller?.abort();
    if (favPoisListener !== null) try { store.off(favPoisListener); } catch {}
    if (favPoisMobileListener !== null) try { store.off(favPoisMobileListener); } catch {}
  });
</script>

<style lang="less">
  .place-search { position: relative; margin-top: 7px; }
  form { display: grid; grid-template-columns: 1fr 28px 28px; gap: 4px; }
  input, form button {
    box-sizing: border-box; height: 28px; border: 1px solid rgba(255,255,255,0.16);
    border-radius: 6px; background: rgba(10,14,18,0.62); color: white;
  }
  input { width: 100%; min-width: 0; padding: 0 7px; font-size: 10.5px; outline: none; }
  input:focus { border-color: rgba(80,190,255,0.72); box-shadow: 0 0 0 1px rgba(80,190,255,0.18); }
  input::placeholder { color: rgba(255,255,255,0.48); }
  form button { padding: 0; font-size: 16px; line-height: 1; font-weight: 800; cursor: pointer; }
  form button:disabled { opacity: 0.45; cursor: default; }
  .fav-button { color: #ffe45c; }
  .results {
    position: absolute; z-index: 5000; left: 0; right: 0; top: 32px; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.16); border-radius: 7px;
    background: rgba(18,21,25,0.98); box-shadow: 0 5px 14px rgba(0,0,0,0.38);
  }
  .result {
    display: block; width: 100%; padding: 6px 7px; border: 0;
    border-bottom: 1px solid rgba(255,255,255,0.08); background: transparent;
    color: rgba(255,255,255,0.94); text-align: left; cursor: pointer;
  }
  .result:hover, .result:focus { background: rgba(80,190,255,0.16); outline: none; }
  .result-main { display: block; font-size: 10px; line-height: 1.15; font-weight: 750; }
  .result-sub { display: block; margin-top: 2px; font-size: 8.5px; line-height: 1.1; opacity: 0.6; }
  .empty, .credit { padding: 5px 7px; color: rgba(255,255,255,0.58); font-size: 8.5px; line-height: 1.15; }
  .credit { text-align: right; }
</style>
