from pathlib import Path

p=Path('src/plugin.svelte')
t=p.read_text(encoding='utf-8')
old="iconSize:[224,176],iconAnchor:[112,184]"
new="iconSize:[228,180],iconAnchor:[114,188]"
if old in t:
    t=t.replace(old,new,1)
elif new not in t:
    raise SystemExit('label geometry anchor not found')
p.write_text(t,encoding='utf-8')

p=Path('package.json')
t=p.read_text(encoding='utf-8')
if '"version": "100.1.0"' in t:
    t=t.replace('"version": "100.1.0"','"version": "100.1.1"',1)
elif '"version": "100.1.1"' not in t:
    raise SystemExit('unexpected package version')
p.write_text(t,encoding='utf-8')

p=Path('src/pluginConfig.ts')
t=p.read_text(encoding='utf-8')
if "version: '100.1.0'" in t:
    t=t.replace("version: '100.1.0'","version: '100.1.1'",1)
elif "version: '100.1.1'" not in t:
    raise SystemExit('unexpected pluginConfig version')
p.write_text(t,encoding='utf-8')
