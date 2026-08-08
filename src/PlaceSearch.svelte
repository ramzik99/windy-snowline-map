<div class="place-search">
  <div class="search-box">
    <input
      bind:value={query}
      placeholder="Search place…"
      aria-label="Search place"
      on:keydown={handleKeydown}
      on:input={scheduleSearch}
      on:focus={() => { if (results.length) open = true; }}
    />
    <button aria-label="Search" title="Search" on:click={searchNow} disabled={searching || query.trim().length < 2}>
      {searching ? '…' : '⌕'}
    </button>
  </div>

  {#if open}
    <div class="results">
      {#if searching}
        <div class="message">Searching…</div>
      {:else if error}
        <div class="message">{error}</div>
      {:else if results.length}
        {#each results as result}
          <button class="result" on:click={() => choose(result)}>
            <strong>{result.primary}</strong>
            {#if result.secondary}<small>{result.secondary}</small>{/if}
          </button>
        {/each}
      {:else if query.trim().length >= 2}
        <div class="message">No places found</div>
      {/if}
    </div>
  {/if}
</div>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { map } from '@windy/map';

  type PlaceResult = {
    lat: number;
    lon: number;
    primary: string;
    secondary: string;
  };

  let query = '';
  let results: PlaceResult[] = [];
  let searching = false;
  let open = false;
  let error = '';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let searchSerial = 0;

  function splitName(displayName: string): { primary: string; secondary: string } {
    const parts = displayName.split(',').map(v => v.trim()).filter(Boolean);
    return {
      primary: parts[0] || displayName,
      secondary: parts.slice(1, 4).join(', '),
    };
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
    timer = setTimeout(searchNow, 650);
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

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=0&q=${encodeURIComponent(text)}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept-Language': navigator.language || 'en' },
      });
      if (!response.ok) throw new Error(`Search failed (${response.status})`);
      const data = await response.json() as any[];
      if (serial !== searchSerial) return;

      results = (Array.isArray(data) ? data : [])
        .map(item => {
          const lat = Number(item?.lat);
          const lon = Number(item?.lon);
          const name = String(item?.display_name || '');
          if (!Number.isFinite(lat) || !Number.isFinite(lon) || !name) return null;
          const split = splitName(name);
          return { lat, lon, ...split } as PlaceResult;
        })
        .filter((item): item is PlaceResult => item !== null);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      if (serial !== searchSerial) return;
      results = [];
      error = 'Place search unavailable';
      console.warn('Snowline place search failed', e);
    } finally {
      if (serial === searchSerial) searching = false;
    }
  }

  function choose(result: PlaceResult) {
    query = result.primary;
    results = [];
    open = false;

    const zoom = Math.max(Number(map.getZoom?.() ?? 7), 9);
    map.setView([result.lat, result.lon], zoom, { animate: true });

    // Reuse the plugin's normal click handler so the selected place
    // immediately receives the same snowline/elevation probe label.
    setTimeout(() => {
      try { map.fire('click', { latlng: { lat: result.lat, lng: result.lon } }); } catch {}
    }, 250);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (results.length && open) choose(results[0]);
      else searchNow();
    } else if (event.key === 'Escape') {
      open = false;
    }
  }

  onDestroy(() => {
    if (timer) clearTimeout(timer);
    controller?.abort();
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
  .result:last-child { border-bottom: 0; }
  .result:hover, .result:focus { background: rgba(80,190,255,0.14); outline: none; }
  .result strong, .result small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .result strong { font-size: 10.5px; line-height: 1.15; }
  .result small { margin-top: 2px; font-size: 8.8px; line-height: 1.1; opacity: 0.62; }
  .message { padding: 7px 8px; font-size: 9.5px; opacity: 0.72; }
</style>
