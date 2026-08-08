<div class="place-search">
  <form on:submit|preventDefault={submitSearch} on:keydown|stopPropagation on:keyup|stopPropagation>
    <input
      bind:value={query}
      on:input={scheduleSearch}
      on:focus={() => { if (visibleResults.length || favourites.length) open = true; }}
      aria-label="Search places"
      placeholder="Search place…"
      autocomplete="off"
      spellcheck="false"
    />
    <button class="fav-button" class:active={showFavourites} type="button" aria-label="Show favourites" on:click={toggleFavourites}>★</button>
    <button type="submit" aria-label="Search" disabled={searching || query.trim().length < 2}>
      {searching ? '…' : '⌕'}
    </button>
  </form>

  {#if open}
    <div class="results">
      {#if visibleResults.length}
        {#each visibleResults as result}
          <div class="result-row">
            <button class="result" type="button" on:click={() => chooseResult(result)}>
              <span class="result-main">{result.primary}</span>
              {#if result.secondary}<span class="result-sub">{result.secondary}</span>{/if}
            </button>
            <button
              class="star"
              class:saved={isFavourite(result)}
              type="button"
              aria-label={isFavourite(result) ? 'Remove favourite' : 'Add favourite'}
              on:click={() => toggleFavourite(result)}
            >{isFavourite(result) ? '★' : '☆'}</button>
          </div>
        {/each}
        {#if !showFavourites && remoteResults.length}<div class="credit">Search © OpenStreetMap contributors</div>{/if}
      {:else if !searching}
        <div class="empty">{showFavourites ? 'No saved favourites' : 'No places found'}</div>
      {/if}
    </div>
  {/if}
</div>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';

  type SearchResult = {
    lat: number;
    lon: number;
    primary: string;
    secondary: string;
  };

  const dispatch = createEventDispatcher<{ select: SearchResult }>();
  const STORAGE_KEY = 'snowline:favourites:v1';

  let query = '';
  let searching = false;
  let open = false;
  let showFavourites = false;
  let remoteResults: SearchResult[] = [];
  let favourites: SearchResult[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let requestId = 0;

  $: favouriteMatches = query.trim()
    ? favourites.filter(item => `${item.primary} ${item.secondary}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : favourites.slice(0, 10);

  $: visibleResults = showFavourites
    ? favouriteMatches
    : mergeResults(favouriteMatches, remoteResults).slice(0, 8);

  function resultKey(item: SearchResult): string {
    return `${item.lat.toFixed(5)},${item.lon.toFixed(5)}`;
  }

  function mergeResults(first: SearchResult[], second: SearchResult[]): SearchResult[] {
    const merged = new Map<string, SearchResult>();
    for (const item of [...first, ...second]) merged.set(resultKey(item), item);
    return [...merged.values()];
  }

  function splitName(name: string): { primary: string; secondary: string } {
    const parts = name.split(',').map(part => part.trim()).filter(Boolean);
    return { primary: parts[0] || 'Place', secondary: parts.slice(1, 3).join(', ') };
  }

  function loadFavourites() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { favourites = []; return; }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) { favourites = []; return; }
      favourites = parsed
        .map((item: any) => ({
          lat: Number(item?.lat), lon: Number(item?.lon),
          primary: String(item?.primary ?? 'Favourite'),
          secondary: String(item?.secondary ?? ''),
        }))
        .filter((item: SearchResult) => Number.isFinite(item.lat) && Number.isFinite(item.lon));
    } catch {
      favourites = [];
    }
  }

  function saveFavourites() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites)); }
    catch (e) { console.warn('Snowline could not save favourites', e); }
  }

  function isFavourite(result: SearchResult): boolean {
    const key = resultKey(result);
    return favourites.some(item => resultKey(item) === key);
  }

  function toggleFavourite(result: SearchResult) {
    const key = resultKey(result);
    if (isFavourite(result)) favourites = favourites.filter(item => resultKey(item) !== key);
    else favourites = [{ ...result }, ...favourites].slice(0, 30);
    saveFavourites();
    open = true;
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
          return { lat, lon, primary, secondary };
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

  onMount(loadFavourites);

  onDestroy(() => {
    if (timer) clearTimeout(timer);
    controller?.abort();
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
  .fav-button { color: rgba(255,255,255,0.62); }
  .fav-button.active { color: #ffe45c; border-color: rgba(255,228,92,0.55); }
  .results {
    position: absolute; z-index: 5000; left: 0; right: 0; top: 32px; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.16); border-radius: 7px;
    background: rgba(18,21,25,0.98); box-shadow: 0 5px 14px rgba(0,0,0,0.38);
  }
  .result-row { display: grid; grid-template-columns: 1fr 30px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .result {
    display: block; width: 100%; min-width: 0; padding: 6px 7px; border: 0;
    background: transparent; color: rgba(255,255,255,0.94); text-align: left; cursor: pointer;
  }
  .result:hover, .result:focus, .star:hover, .star:focus { background: rgba(80,190,255,0.16); outline: none; }
  .result-main { display: block; font-size: 10px; line-height: 1.15; font-weight: 750; }
  .result-sub { display: block; margin-top: 2px; font-size: 8.5px; line-height: 1.1; opacity: 0.6; }
  .star { border: 0; border-left: 1px solid rgba(255,255,255,0.08); background: transparent; color: rgba(255,255,255,0.52); font-size: 15px; cursor: pointer; }
  .star.saved { color: #ffe45c; }
  .empty, .credit { padding: 5px 7px; color: rgba(255,255,255,0.58); font-size: 8.5px; line-height: 1.15; }
  .credit { text-align: right; }
</style>
