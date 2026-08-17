<div class="v21-panel">
  <div class="meta-row">
    <div class="units" role="group" aria-label="Display units">
      <button type="button" class:active={unitSystem === 'metric'} on:click={() => setUnits('metric')}>Metric</button>
      <button type="button" class:active={unitSystem === 'imperial'} on:click={() => setUnits('imperial')}>Imperial</button>
    </div>
    <span class="freshness">{freshnessLabel}</span>
  </div>
  <button class="saved-toggle" type="button" aria-expanded={savedOpen} on:click={toggleSaved}>
    <span>★ Saved outlook</span><span>{savedOpen ? '−' : '+'}</span>
  </button>
  {#if savedOpen}
    <div class="saved-box">
      {#if loading}<div class="message">Updating saved places…</div>
      {:else if rows.length}
        {#each rows as row}
          <button class="saved-row" class:hazard={row.event?.dominantPhase.key === 'freezing-rain' || row.event?.dominantPhase.key === 'ice-pellets'} type="button" on:click={() => choose(row)}>
            <span class="place"><b>{row.primary}</b>{#if row.secondary}<small>{row.secondary}</small>{/if}</span>
            <span class="forecast">
              {#if row.error}<b>Unavailable</b>
              {:else if row.event}<b>{row.event.dominantPhase.icon} {row.event.dominantPhase.label}</b><small>{shortTime(row.event.startTime)} · {formatSnow(row.event.newSnowCm, unitSystem)} · {confidenceLabel(row.event.confidence)}</small>
              {:else}<b>No wintry event</b><small>through +144 h</small>{/if}
            </span>
          </button>
        {/each}
      {:else}<div class="message">No saved places.</div>{/if}
    </div>
  {/if}
</div>

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getElevation, getMeteogramForecastData } from '@windy/fetch';
  import { valueAt } from './snowLevel';
  import { loadSelectedPrecipFields } from './selectedPrecip';
  import { nextWintryEvent, type EventConfidence, type WintryEventSummary } from './eventOutlook';
  import { formatSnow, saveUnitSystem, type UnitSystem } from './displayUnits';

  export let unitSystem: UnitSystem = 'metric';
  export let activeRunTime: number | null = null;

  type Favourite = { lat:number; lon:number; primary:string; secondary:string };
  type SavedRow = Favourite & { event:WintryEventSummary|null; error:boolean };
  const dispatch = createEventDispatcher<{ select: Favourite }>();
  const STORAGE_KEY = 'snowline:favourites:v1';
  const MAX_HOURS = 144;
  let savedOpen = false;
  let loading = false;
  let rows: SavedRow[] = [];
  let now = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;

  $: freshnessLabel = runFreshness(activeRunTime, now);

  function setUnits(value: UnitSystem){ unitSystem = value; saveUnitSystem(value); }
  function shortTime(t:number){ return new Date(t).toLocaleString(undefined,{weekday:'short',hour:'2-digit',minute:'2-digit'}); }
  function confidenceLabel(c:EventConfidence){ return `${c[0].toUpperCase()}${c.slice(1)} confidence`; }
  function runFreshness(run:number|null, reference:number){
    if(run===null||!Number.isFinite(run)) return 'ECMWF';
    const d=new Date(run), cycle=`${String(d.getUTCHours()).padStart(2,'0')}Z`, age=Math.max(0,(reference-run)/3600_000);
    return `ECMWF ${cycle} · ${age<1?'<1':Math.round(age)} h old`;
  }
  function readFavourites():Favourite[]{
    try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(p)?p.map((x:any)=>({lat:Number(x.lat),lon:Number(x.lon),primary:String(x.primary||'Saved place'),secondary:String(x.secondary||'')})).filter((x:Favourite)=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)).slice(0,10):[]}catch{return[]}
  }
  function parseTime(v:unknown):number|null{if(typeof v==='number'&&Number.isFinite(v))return v>1e12?v:v>1e9?v*1000:null;if(typeof v==='string'){const p=Date.parse(v);if(Number.isFinite(p))return p}return null}
  function forecastTimes(data:Record<string,unknown>,header:Record<string,unknown>):number[]{
    const hours=data.hours, length=Number((hours as any)?.length); if(!hours||!Number.isFinite(length)||length<=0)return[];
    const raw:number[]=[];for(let i=0;i<length;i++){const v=valueAt(hours,i);if(v!==null)raw.push(v)}if(!raw.length)return[];
    let times:number[];if(raw[0]>1e12)times=raw;else if(raw[0]>1e9)times=raw.map(v=>v*1000);else{const ref=parseTime(header.refTime);if(ref===null)return[];times=raw.map(h=>ref+h*3600_000)}
    return times.filter(t=>t<=times[0]+MAX_HOURS*3600_000+60_000);
  }
  function elevationNumber(r:any):number|null{for(const c of[r?.data,r?.data?.data,r?.value]){const n=Number(c);if(Number.isFinite(n))return n}return null}
  async function loadOne(f:Favourite):Promise<SavedRow>{
    try{
      const [raw,elevRaw,extra]=await Promise.all([getMeteogramForecastData('ecmwf',{lat:f.lat,lon:f.lon,step:1,days:6}),getElevation(f.lat,f.lon),loadSelectedPrecipFields(f.lat,f.lon,6)]);
      const r=raw as any, forecast=r?.data?.data&&typeof r.data.data==='object'?r.data.data as Record<string,unknown>:{},header=r?.data?.header&&typeof r.data.header==='object'?r.data.header as Record<string,unknown>:{},times=forecastTimes(forecast,header),terrain=elevationNumber(elevRaw);
      if(!times.length||terrain===null)return{...f,event:null,error:true};
      const point={lat:f.lat,lon:f.lon,forecast:{...forecast,...extra},header,times,runTime:parseTime(header.refTime),step:1};
      return{...f,event:nextWintryEvent(point,terrain,Date.now()),error:false};
    }catch{return{...f,event:null,error:true}}
  }
  async function refreshSaved(){const fav=readFavourites();if(!fav.length){rows=[];return}loading=true;try{const out:SavedRow[]=[];for(let i=0;i<fav.length;i+=3){out.push(...await Promise.all(fav.slice(i,i+3).map(loadOne)))}rows=out}finally{loading=false}}
  function toggleSaved(){savedOpen=!savedOpen;if(savedOpen)void refreshSaved()}
  function choose(row:SavedRow){dispatch('select',{lat:row.lat,lon:row.lon,primary:row.primary,secondary:row.secondary})}
  onMount(()=>{timer=setInterval(()=>now=Date.now(),60_000);return()=>{if(timer)clearInterval(timer)}});
</script>

<style lang="less">
.v21-panel{margin-top:6px}.meta-row{display:flex;align-items:center;justify-content:space-between;gap:6px}.units{display:flex;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:6px}.units button{height:23px;padding:0 7px;border:0;background:rgba(255,255,255,.04);color:#8898a2;font-size:7.5px;font-weight:800;cursor:pointer}.units button.active{background:rgba(80,190,255,.16);color:#dff7ff}.freshness{color:#788a94;font-size:7.2px;font-weight:700;white-space:nowrap}.saved-toggle{display:flex;width:100%;height:26px;margin-top:5px;padding:0 7px;align-items:center;justify-content:space-between;border:1px solid rgba(255,255,255,.09);border-radius:7px;background:rgba(255,255,255,.035);color:#b9c6cc;font-size:8px;font-weight:800;cursor:pointer}.saved-box{margin-top:4px;max-height:210px;overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(8,12,15,.55)}.saved-row{display:grid;grid-template-columns:1fr 1fr;width:100%;gap:6px;padding:6px 7px;border:0;border-bottom:1px solid rgba(255,255,255,.06);background:transparent;color:#fff;text-align:left;cursor:pointer}.saved-row:last-child{border-bottom:0}.saved-row:hover,.saved-row:focus-visible{background:rgba(80,190,255,.10);outline:none}.saved-row.hazard{box-shadow:inset 3px 0 #c184ff}.place,.forecast{min-width:0}.place b,.forecast b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8.2px}.place small,.forecast small{display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#83949d;font-size:6.7px}.message{padding:9px;color:#83949d;text-align:center;font-size:8px}
</style>
