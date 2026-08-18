from pathlib import Path

# Re-triggered after v100.1.0 final convenience release landed.
p = Path('src/plugin.svelte')
t = p.read_text(encoding='utf-8')

repls = {
":global(.snowline-click-label>span){position:relative;display:flex;flex-direction:column;gap:5px;width:224px;min-height:142px;box-sizing:border-box;padding:37px 8px 8px;border-radius:13px;border:1px solid rgba(255,255,255,.14);border-top:3px solid var(--probe-accent,rgba(255,255,255,.4));border-bottom:4px solid var(--snowline-color,white);background:rgba(9,14,18,.985);color:#fff;text-align:center;white-space:normal;text-shadow:none;box-shadow:0 10px 28px rgba(0,0,0,.58)}":
":global(.snowline-click-label>span){position:relative;display:flex;flex-direction:column;gap:6px;width:228px;min-height:146px;box-sizing:border-box;padding:40px 9px 9px;border-radius:14px;border:1px solid rgba(255,255,255,.11);border-top:2px solid var(--probe-accent,rgba(255,255,255,.4));border-bottom:3px solid var(--snowline-color,white);background:linear-gradient(180deg,rgba(11,17,21,.985),rgba(7,12,16,.99));color:#fff;text-align:center;white-space:normal;text-shadow:none;box-shadow:0 10px 30px rgba(0,0,0,.54)}",
":global(.snowline-card-kicker){position:absolute;top:12px;left:70px;right:70px;color:#71838e;font-size:6.5px;line-height:1;font-weight:900;letter-spacing:1px;text-align:center;pointer-events:none}":
":global(.snowline-card-kicker){position:absolute;top:12px;left:74px;right:74px;color:#7f929e;font-size:6px;line-height:1;font-weight:900;letter-spacing:1.15px;text-align:center;white-space:nowrap;pointer-events:none}",
":global(.snowline-label-close),:global(.snowline-label-share),:global(.snowline-label-chart),:global(.snowline-label-favourite){position:absolute;top:7px;height:27px;padding:0;border:1px solid rgba(255,255,255,.10);border-radius:7px;background:rgba(255,255,255,.065);color:#eaf2f6;font-size:12px;line-height:25px;font-weight:800;text-shadow:none;cursor:pointer;pointer-events:auto}":
":global(.snowline-label-close),:global(.snowline-label-share),:global(.snowline-label-chart),:global(.snowline-label-favourite){position:absolute;top:7px;height:27px;padding:0;border:1px solid rgba(255,255,255,.085);border-radius:8px;background:rgba(255,255,255,.045);color:#dfe9ee;font-size:12px;line-height:25px;font-weight:800;text-shadow:none;cursor:pointer;pointer-events:auto;transition:background .12s ease,border-color .12s ease}:global(.snowline-label-close:hover),:global(.snowline-label-share:hover),:global(.snowline-label-chart:hover),:global(.snowline-label-favourite:hover){background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.16)}",
":global(.snowline-click-label b){display:block;padding:5px 7px;border-radius:8px;background:rgba(255,255,255,.035);color:var(--probe-accent,white);font-size:14px;line-height:1.1;font-weight:900;letter-spacing:.25px}":
":global(.snowline-click-label b){display:block;padding:4px 7px 2px;border-radius:8px;background:transparent;color:var(--probe-accent,white);font-size:15px;line-height:1.05;font-weight:900;letter-spacing:.25px}",
":global(.snowline-card-dry>span>b){padding:3px 7px;background:transparent;font-size:11px;letter-spacing:.7px;opacity:.9}":
":global(.snowline-card-dry>span>b){padding:3px 7px 1px;background:transparent;font-size:12px;letter-spacing:.8px;opacity:.95}",
":global(.snowline-label-grid span),:global(.snowline-outlook-grid span){min-width:0;padding:5px 4px;border-radius:7px;background:rgba(255,255,255,.04);text-align:center}":
":global(.snowline-label-grid span),:global(.snowline-outlook-grid span){min-width:0;padding:6px 4px 5px;border-radius:8px;background:rgba(255,255,255,.028);border:1px solid rgba(255,255,255,.045);text-align:center}",
":global(.snowline-label-grid small),:global(.snowline-outlook-grid small){display:block;color:#8696a0;font-size:6.6px;line-height:1;text-transform:uppercase;letter-spacing:.22px}":
":global(.snowline-label-grid small),:global(.snowline-outlook-grid small){display:block;color:#7f919b;font-size:6.2px;line-height:1;text-transform:uppercase;letter-spacing:.42px;font-weight:800}",
":global(.snowline-label-grid strong),:global(.snowline-outlook-grid strong){display:block;margin-top:3px;color:#eef5f8;font-size:9.5px;line-height:1.05;font-weight:850}":
":global(.snowline-label-grid strong),:global(.snowline-outlook-grid strong){display:block;margin-top:4px;color:#eef5f8;font-size:10.5px;line-height:1;font-weight:900}",
":global(.snowline-valid){margin:-1px 0 0;color:#7f919b;font-size:7px;line-height:1;font-weight:800;text-align:center}":
":global(.snowline-valid){margin:-1px 0 1px;color:#8799a4;font-size:7.2px;line-height:1;font-weight:800;text-align:center}",
":global(.snowline-compact-relation){display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;box-sizing:border-box;padding:5px 6px;border-radius:7px;background:rgba(255,255,255,.045);color:var(--probe-accent,white);font-size:8px;line-height:1.1;font-weight:850;text-align:left}":
":global(.snowline-compact-relation){display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;box-sizing:border-box;padding:5px 7px;border-radius:8px;background:rgba(255,255,255,.025);color:var(--probe-accent,white);font-size:8.2px;line-height:1.1;font-weight:850;text-align:left}",
":global(.snowline-event-line){width:100%;box-sizing:border-box;padding:6px 7px;border-radius:7px;background:rgba(110,203,255,.055);color:#dce9ef;text-align:left;font-size:8px;line-height:1.2;font-weight:800}":
":global(.snowline-event-line){width:100%;box-sizing:border-box;padding:6px 7px;border-radius:8px;background:rgba(110,203,255,.045);color:#d8e5eb;text-align:left;font-size:7.8px;line-height:1.2;font-weight:800}",
"@media(max-width:520px){.snowline-panel{width:235px;max-width:calc(100vw - 28px);padding:8px 9px}.info-overlay{align-items:flex-start;padding-top:54px}:global(.snowline-click-label>span){width:216px;min-height:138px;padding:37px 8px 8px}:global(.snowline-card-kicker){left:66px;right:66px}":
"@media(max-width:520px){.snowline-panel{width:235px;max-width:calc(100vw - 28px);padding:8px 9px}.info-overlay{align-items:flex-start;padding-top:54px}:global(.snowline-click-label>span){width:220px;min-height:142px;padding:40px 8px 8px}:global(.snowline-card-kicker){left:72px;right:72px}"
}

for old,new in repls.items():
    if old not in t:
        if 'snowline-event-line' in old:
            continue
        raise SystemExit('label style anchor not found: ' + old[:80])
    t=t.replace(old,new,1)

old_button=':global(.snowline-event-line){width:100%;box-sizing:border-box;padding:6px 7px;border:0;border-radius:7px;background:rgba(110,203,255,.055);color:#dce9ef;text-align:left;font-family:inherit;font-size:8px;line-height:1.2;font-weight:800}'
new_button=':global(.snowline-event-line){width:100%;box-sizing:border-box;padding:6px 7px;border:0;border-radius:8px;background:rgba(110,203,255,.045);color:#d8e5eb;text-align:left;font-family:inherit;font-size:7.8px;line-height:1.2;font-weight:800}'
if old_button in t:
    t=t.replace(old_button,new_button,1)

p.write_text(t,encoding='utf-8')

p=Path('package.json')
t=p.read_text(encoding='utf-8')
for old in ['"version": "100.0.1"','"version": "100.1.0"']:
    if old in t:
        t=t.replace(old,'"version": "100.1.1"',1)
        break
else:
    raise SystemExit('unexpected package version')
p.write_text(t,encoding='utf-8')

p=Path('src/pluginConfig.ts')
t=p.read_text(encoding='utf-8')
for old in ["version: '100.0.1'","version: '100.1.0'"]:
    if old in t:
        t=t.replace(old,"version: '100.1.1'",1)
        break
else:
    raise SystemExit('unexpected pluginConfig version')
p.write_text(t,encoding='utf-8')
