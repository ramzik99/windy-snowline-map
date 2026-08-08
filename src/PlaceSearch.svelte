<div class="place-search">
  <div class="search-box">
    <input
      bind:this={inputElement}
      bind:value={query}
      placeholder="Search place or favourite…"
      aria-label="Search place or favourite"
      on:keydown={handleKeydown}
      on:keyup={stopKeyboardEvent}
      on:keypress={stopKeyboardEvent}
      on:input={scheduleSearch}
      on:focus={() => { refreshFavourites(); if (results.length) open = true; }}
    />
    <button aria-label="Search" title="Search" on:click={searchNow} disabled={searching || query.trim().length < 2}>
      {searching ? '…' : '⌕'}
    </button>
  </div>

  {#if open}
    <div class="results">
      {#if searching && !results.length}
        <div class="message">Searching…</div>
      {:else if error && !results.length}
        <div class="message">{error}</div>
      {:else if results.length}
        {#each results as result}
          <button class="result" class:favourite={result.source === 'favourite'} on:click={() => choose(result)}>
            <strong>{result.source === 'favourite' ? '★ ' : ''}{result.primary}</strong>
            {#if result.secondary}<small>{result.secondary}</small>{/if}
          </button>
        {/each}
        {#if searching}<div class="message compact">Searching other places…</div>{/if}
      {:else if query.trim().length >= 2}
        <div class="message">No places or favourites found</div>
      {/if}
    </div>
  {/if}
</div>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import store from '@windy/store';

  type PlaceResult = {
    lat: number | null;
    lon: number | null;
    primary: string;
    secondary: string;
    source: 'place' | 'favourite';
    searchText?: string;
  };

  type SelectedPlace = {
    lat: number;
    lon: number;
    primary: string;
    secondary: string;
  };

  const dispatch = createEventDispatcher<{ select: SelectedPlace }>();

  let query = '';
  let results: PlaceResult[] = [];
  let favourites: PlaceResult[] = [];
  let searching = false;
  let open = false;
  let error = '';
  let inputElement: HTMLInputElement | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let searchSerial = 0;
  let favPoisListener: number | null = null;
  let favPoisMobileListener: number | null = null;

  function splitName(displayName: string): { primary: string; secondary: string } {
    const parts = displayName.split(',').map(v => v.trim()).filter(Boolean);
    return {
      primary: parts[0] || displayName,
      secondary: parts.slice(1, 4).join(', '),
    };
  }

  function stopKeyboardEvent(event: KeyboardEvent) {
    // Windy has global single-key shortcuts (for example "f").
    // Keep keystrokes inside this input so typing never triggers them.
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }

  function validCoords(lat: unknown, lon: unknown): [number, number] | null {
    const a = Number(lat), b = Number(lon);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    if (a < -90 || a > 90 || b < -180 || b > 180) return null;
    return [a, b];
  }

  function cleanFavouriteLabel(raw: string): string {
    let text = raw;
    try { text = decodeURIComponent(raw); } catch {}
    text = text
      .replace(/-?\d{1,2}(?:\.\d+)?\s*[,;|:/ ]+\s*-?\d{1,3}(?:\.\d+)?/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[_|;]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text || 'Favourite';
  }

  function favouriteFromRaw(rawValue: unknown): PlaceResult | null {
    if (typeof rawValue !== 'string' || !rawValue.trim()) return null;
    const raw = rawValue.trim();

    // Some Windy builds may serialize richer favourite objects as strings.
    try {
      const parsed = JSON.parse(raw) as any;
      if (parsed && typeof parsed === 'object') {
        const coords = validCoords(parsed.lat ?? parsed.latitude, parsed.lon ?? parsed.lng ?? parsed.longitude);
        const label = String(parsed.name ?? parsed.title ?? parsed.label ?? parsed.displayName ?? '').trim();
        if (coords || label) {
          return {
            lat: coords?.[0] ?? null,
            lon: coords?.[1] ?? null,
            primary: label || 'Favourite',
            secondary: 'Windy favourite',
            source: 'favourite',
            searchText: label || raw,
          };
        }
      }
    } catch {}

    let decoded = raw;
    try { decoded = decodeURIComponent(raw); } catch {}

    // Be tolerant of common coordinate encodings in favourite IDs/strings.
    const match = decoded.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,;|:/ ]+\s*(-?\d{1,3}(?:\.\d+)?)/);
    const coords = match ? validCoords(match[1], match[2]) : null;
    const label = cleanFavouriteLabel(decoded);

    return {
      lat: coords?.[0] ?? null,
      lon: coords?.[1] ?? null,
      primary: label,
      secondary: 'Windy favourite',
      source: 'favourite',
      searchText: label,
    };
  }

  function readFavouriteStrings(): string[] {
    const out: string[] = [];
    for (const key of ['favPois', 'favPoisMobile'] as const) {
      try {
        const value = store.get(key) as unknown;
        if (Array.isArray(value)) {
          for (const item of value) if (typeof item === 'string' && item.trim()) out.push(item);
        }
      } catch {}
    }
    return [...new Set(out)];
  }

  function refreshFavourites() {
    favourites = readFavouriteStrings()
      .map(favouriteFromRaw)
      .filter((item): item is PlaceResult => item !== null);

    if (query.trim().length >= 2) updateVisibleFavourites();
  }

  function matchingFavourites(text: string): PlaceResult[] {
    const needle = text.toLocaleLowerCase();
    return favourites
      .filter(item => `${item.primary} ${item.secondary} ${item.searchText ?? ''}`.toLocaleLowerCase().includes(needle))
      .slice(0, 5);
  }

  function updateVisibleFavourites() {
    const text = query.trim();
    if (text.length < 2) return;
    const favs = matchingFavourites(text);
    const places = results.filter(item => item.source !== 'favourite');
    results = [...favs, ...places].slice(0, 7);
    if (results.length) open = true;
  }

  function scheduleSearch() {
    error = '';
    if (timer) clearTimeout(timer);
    const text = query.trim();
    if (text.length < 2) {
      results = [];
      open = false;
      return;
    }
    refreshFavourites();
    results = matchingFavourites(text);
    open = true;
    timer = setTimeout(searchNow, 650);
  }

  async function fetchPlaceResults(text: string, limit = 5): Promise<PlaceResult[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&addressdetails=0&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      signal: controller?.signal,
      headers: { 'Accept-Language': navigator.language || 'en' },
    });
    if (!response.ok) throw new Error(`Search failed (${response.status})`);
    const data = await response.json() as any[];
    return (Array.isArray(data) ? data : [])
      .map(item => {
        const coords = validCoords(item?.lat, item?.lon);
        const name = String(item?.display_name || '');
        if (!coords || !name) return null;
        const split = splitName(name);
        return { lat: coords[0], lon: coords[1], ...split, source: 'place' as const };
      })
      .filter((item): item is PlaceResult => item !== null);
  }

  async function searchNow() {
    const text = query.trim();
    if (text.length < 2) return;

    if (timer) { clearTimeout(timer); timer = null; }
    controller?.abort();
    controller = new AbortController();
    const serial = ++searchSerial;
    searching = true;
    open = true;
    error = '';

    refreshFavourites();
    const favs = matchingFavourites(text);
    results = favs;

    try {
      const places = await fetchPlaceResults(text, 5);
      if (serial !== searchSerial) return;

      const seen = new Set(favs.map(item => `${item.lat?.toFixed(4)},${item.lon?.toFixed(4)}:${item.primary.toLocaleLowerCase()}`));
      const uniquePlaces = places.filter(item => {
        const key = `${item.lat?.toFixed(4)},${item.lon?.toFixed(4)}:${item.primary.toLocaleLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      results = [...favs, ...uniquePlaces].slice(0, 7);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      if (serial !== searchSerial) return;
      if (!favs.length) {
        results = [];
        error = 'Place search unavailable';
      } else {
        results = favs;
      }
      console.warn('Snowline place search failed', e);
    } finally {
      if (serial === searchSerial) searching = false;
    }
  }

  async function choose(result: PlaceResult) {
    let lat = result.lat;
    let lon = result.lon;

    // If Windy exposes a favourite only as a textual ID/name, resolve that
    // favourite to coordinates before passing it to the Snowline probe.
    if ((lat === null || lon === null) && result.source === 'favourite') {
      controller?.abort();
      controller = new AbortController();
      searching = true;
      try {
        const resolved = await fetchPlaceResults(result.searchText || result.primary, 1);
        if (resolved.length) {
          lat = resolved[0].lat;
          lon = resolved[0].lon;
        }
      } catch (e) {
        console.warn('Snowline favourite location resolution failed', e);
      } finally {
        searching = false;
      }
    }

    if (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      error = 'Favourite location unavailable';
      open = true;
      return;
    }

    query = result.primary;
    results = [];
    open = false;
    inputElement?.blur();
    dispatch('select', { lat, lon, primary: result.primary, secondary: result.secondary });
  }

  function handleKeydown(event: KeyboardEvent) {
    stopKeyboardEvent(event);

    if (event.key === 'Enter') {
      event.preventDefault();
      if (results.length && open) choose(results[0]);
      else searchNow();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      open = false;
      inputElement?.blur();
    }
  }

  onMount(() => {
    refreshFavourites();
    try { favPoisListener = store.on('favPois', () => refreshFavourites()); } catch {}
    try { favPoisMobileListener = store.on('favPoisMobile', () => refreshFavourites()); } catch {}
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
  .search-box { display: grid; grid-template-columns: 1fr 28px; gap: 4px; }
  .search-box input {
    min-width: 0;
    height: 27px;
    padding: 0 8px;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 6px;
    outline: none;
    background: rgba(10,14,18,0.52);
    color: white;
    font-size: 10.5px;
  }
  .search-box input:focus { border-color: rgba(80,190,255,0.78); box-shadow: 0 0 0 1px rgba(80,190,255,0.18); }
  .search-box input::placeholder { color: rgba(255,255,255,0.48); }
  .search-box button {
    height: 27px;
    padding: 0;
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 6px;
    background: rgba(255,255,255,0.07);
    color: white;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }
  .search-box button:disabled { opacity: 0.42; cursor: default; }
  .results {
    position: absolute;
    z-index: 3000;
    top: calc(100% + 3px);
    left: 0;
    right: 0;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 7px;
    background: rgba(22,24,28,0.98);
    box-shadow: 0 5px 14px rgba(0,0,0,0.42);
  }
  .result {
    width: 100%;
    padding: 6px 8px;
    border: 0;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: transparent;
    color: white;
    text-align: left;
    cursor: pointer;
  }
  .result.favourite { background: rgba(255,228,92,0.06); }
  .result:last-child { border-bottom: 0; }
  .result:hover, .result:focus { background: rgba(80,190,255,0.14); outline: none; }
  .result strong, .result small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .result strong { font-size: 10.5px; line-height: 1.15; }
  .result.favourite strong { color: #ffe45c; }
  .result small { margin-top: 2px; font-size: 8.8px; line-height: 1.1; opacity: 0.62; }
  .message { padding: 7px 8px; font-size: 9.5px; opacity: 0.72; }
  .message.compact { padding-top: 4px; padding-bottom: 4px; font-size: 8.7px; }
</style>
