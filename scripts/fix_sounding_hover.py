from pathlib import Path

p=Path('src/SoundingChart.svelte')
t=p.read_text(encoding='utf-8')

old="""    <div class=\"sounding-viewport\" bind:this={viewport} tabindex=\"0\" role=\"application\" aria-label=\"Zoomable forecast sounding\" on:wheel|preventDefault={handleWheel} on:pointerdown={startPlotPointer} on:pointermove={movePlotPointer} on:pointerup={endPlotPointer} on:pointercancel={endPlotPointer} on:pointerleave={() => { if (!plotPointers.size) hoverNode = null; }} on:dblclick={resetZoom} on:keydown={handleViewportKey}>"""
new="""    <div class=\"sounding-viewport\" bind:this={viewport} tabindex=\"0\" role=\"application\" aria-label=\"Zoomable forecast sounding\" on:wheel|preventDefault={handleWheel} on:pointerdown={startPlotPointer} on:pointermove={movePlotPointer} on:pointerup={endPlotPointer} on:pointercancel={endPlotPointer} on:pointerleave={leavePlot} on:dblclick={resetZoom} on:keydown={handleViewportKey}>"""
if old not in t: raise SystemExit('viewport anchor not found')
t=t.replace(old,new,1)

old="""    {#if hoverNode}<div class=\"sounding-hover\" style={`left:${Math.min(window.innerWidth-180,hoverNode.clientX+12)}px;top:${Math.max(8,hoverNode.clientY-82)}px`}><b>{Math.round(hoverNode.pressure)} hPa · {formatElevation(hoverNode.height,units)}</b><span>T {formatTemperature(hoverNode.temp,units)}</span><span>Td {formatTemperature(hoverNode.dew,units)}</span><span>Tw {formatTemperature(hoverNode.wet,units)}</span></div>{/if}"""
new="""    {#if hoverNode}<div class=\"sounding-hover\" style={`left:${hoverNode.tooltipX}px;top:${hoverNode.tooltipY}px`}><b>{Math.round(hoverNode.pressure)} hPa · {formatElevation(hoverNode.height,units)}</b><span>T {formatTemperature(hoverNode.temp,units)}</span><span>Td {formatTemperature(hoverNode.dew,units)}</span><span>Tw {formatTemperature(hoverNode.wet,units)}</span></div>{/if}"""
if old not in t: raise SystemExit('tooltip anchor not found')
t=t.replace(old,new,1)

old="""  let hoverNode: {tx:number;dx:number;wx:number;y:number;pressure:number;height:number;temp:number;dew:number;wet:number;clientX:number;clientY:number}|null=null;"""
new="""  let hoverNode: {tx:number;dx:number;wx:number;y:number;pressure:number;height:number;temp:number;dew:number;wet:number;tooltipX:number;tooltipY:number}|null=null;"""
if old not in t: raise SystemExit('hover type anchor not found')
t=t.replace(old,new,1)

old="""  function startPlotPointer(event: PointerEvent) {
    if (!viewport || (event.pointerType === 'mouse' && event.button !== 0)) return;
    plotPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });"""
new="""  function startPlotPointer(event: PointerEvent) {
    if (!viewport || (event.pointerType === 'mouse' && event.button !== 0)) return;
    inspectPointer(event);
    plotPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });"""
if old not in t: raise SystemExit('pointerdown anchor not found')
t=t.replace(old,new,1)

old="""  function inspectPointer(event:PointerEvent){if(!svgEl||!sounding)return;const rect=svgEl.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return;const sy=(event.clientY-rect.top)/Math.max(1,rect.height)*390;const n=[...sounding.nodes].sort((a,b)=>Math.abs(a.y-sy)-Math.abs(b.y-sy))[0];if(n)hoverNode={...n,clientX:event.clientX,clientY:event.clientY}}
"""
new="""  function inspectPointer(event: PointerEvent) {
    if (!svgEl || !viewport || !sounding?.nodes?.length) return;
    const rect = svgEl.getBoundingClientRect();
    const sx = (event.clientX - rect.left) / Math.max(1, rect.width) * 330;
    const sy = (event.clientY - rect.top) / Math.max(1, rect.height) * 390;
    if (sx < 48 || sx > 310 || sy < 22 || sy > 342) { if (!plotPointers.size) hoverNode = null; return; }
    let nearest = sounding.nodes[0], distance = Math.abs(nearest.y - sy);
    for (let i = 1; i < sounding.nodes.length; i++) {
      const d = Math.abs(sounding.nodes[i].y - sy);
      if (d < distance) { nearest = sounding.nodes[i]; distance = d; }
    }
    const vr = viewport.getBoundingClientRect();
    const tooltipWidth = 160, tooltipHeight = 62, gap = 8;
    const preferRight = vr.right + gap + tooltipWidth <= window.innerWidth - 6;
    const tooltipX = preferRight ? vr.right + gap : Math.max(6, vr.left - tooltipWidth - gap);
    const nodeClientY = rect.top + nearest.y / 390 * rect.height;
    const tooltipY = Math.max(6, Math.min(window.innerHeight - tooltipHeight - 6, nodeClientY - tooltipHeight / 2));
    hoverNode = { ...nearest, tooltipX, tooltipY };
  }
  function leavePlot() {
    if (!plotPointers.size) hoverNode = null;
  }
"""
if old not in t: raise SystemExit('inspectPointer anchor not found')
t=t.replace(old,new,1)

# Make hover targets a little clearer and tooltip width deterministic.
t=t.replace(".hover-level{stroke:rgba(255,255,255,.45);stroke-width:.8;stroke-dasharray:2 2}", ".hover-level{stroke:rgba(255,255,255,.58);stroke-width:1;stroke-dasharray:2 2}",1)
t=t.replace("min-width:145px", "width:160px;box-sizing:border-box",1)

p.write_text(t,encoding='utf-8')
