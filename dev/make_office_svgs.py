import os, sys
root = sys.argv[1]
INK = '#4E3424'
S = f'stroke="{INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"'
def wrap(inner, title):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="{title}">
<title>{title}</title>
<circle cx="60" cy="60" r="56" fill="#F4ECDF"/>
<ellipse cx="60" cy="98" rx="30" ry="4" fill="#E6D8C6"/>
{inner}
</svg>
'''
icons = {
'computer': f'''<rect x="24" y="28" width="72" height="48" rx="5" fill="#5A4636" {S}/>
<rect x="30" y="34" width="60" height="36" rx="2" fill="#BFDDF0"/>
<path d="M52 76l-4 14h24l-4-14" fill="#C9A27E" {S}/><path d="M42 92h36" {S}/>
<path d="M38 46h24M38 54h32M38 62h18" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>''',
'printer': f'''<rect x="38" y="24" width="44" height="22" rx="2" fill="#FFFFFF" {S}/>
<rect x="24" y="44" width="72" height="32" rx="6" fill="#8E9AAF" {S}/>
<rect x="36" y="66" width="48" height="28" rx="2" fill="#FFFFFF" {S}/>
<path d="M44 76h28M44 84h20" stroke="#C9A27E" stroke-width="3" stroke-linecap="round"/>
<circle cx="84" cy="54" r="3" fill="#7FA36E"/>''',
'desk': f'''<rect x="18" y="50" width="84" height="10" rx="2" fill="#B9774F" {S}/>
<path d="M24 60v32M96 60v32" {S}/>
<rect x="62" y="60" width="30" height="24" fill="#C9A27E" {S}/><path d="M70 72h14" {S}/>
<rect x="30" y="36" width="22" height="14" rx="2" fill="#FFFFFF" {S}/>
<path d="M70 50c0-8 4-12 10-12s10 4 10 12" fill="#8DAA6B" {S}/>''',
'meeting': f'''<ellipse cx="60" cy="74" rx="40" ry="12" fill="#B9774F" {S}/>
<circle cx="32" cy="44" r="9" fill="#F2C9A0" {S}/><path d="M20 66c2-10 8-14 12-14s10 4 12 14" fill="#8DB3D9" {S}/>
<circle cx="60" cy="38" r="9" fill="#F2C9A0" {S}/><path d="M48 62c2-10 8-14 12-14s10 4 12 14" fill="#D9644A" {S}/>
<circle cx="88" cy="44" r="9" fill="#F2C9A0" {S}/><path d="M76 66c2-10 8-14 12-14s10 4 12 14" fill="#7FA36E" {S}/>''',
'email': f'''<rect x="22" y="34" width="76" height="52" rx="6" fill="#FFFFFF" {S}/>
<path d="M24 38l36 28 36-28" fill="none" {S}/>
<circle cx="88" cy="34" r="12" fill="#D9644A" {S}/><path d="M84 34h8M88 30v8" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>''',
'manager': f'''<circle cx="60" cy="42" r="16" fill="#F2C9A0" {S}/>
<path d="M44 38c2-12 30-14 32 0-6-4-24-4-32 0z" fill="#4E3424"/>
<path d="M30 96c2-20 14-30 30-30s28 10 30 30z" fill="#4A5A7A" {S}/>
<path d="M52 66l8 8 8-8" fill="#FFFFFF" {S}/><path d="M60 74l-4 18h8z" fill="#D9644A" {S}/>''',
'report': f'''<path d="M34 22h38l14 14v62H34z" fill="#FFFFFF" {S}/><path d="M72 22v14h14" fill="none" {S}/>
<rect x="42" y="66" width="8" height="20" fill="#8DB3D9" {S}/><rect x="56" y="56" width="8" height="30" fill="#7FA36E" {S}/><rect x="70" y="48" width="8" height="38" fill="#E2B865" {S}/>
<path d="M42 34h22M42 42h30" stroke="#C9A27E" stroke-width="3" stroke-linecap="round"/>''',
'schedule': f'''<rect x="24" y="30" width="72" height="62" rx="6" fill="#FFFFFF" {S}/>
<path d="M24 46h72" {S}/><rect x="24" y="30" width="72" height="16" rx="6" fill="#D9644A" {S}/>
<path d="M40 24v12M80 24v12" {S}/>
<g fill="#C9A27E"><rect x="34" y="54" width="10" height="8" rx="2"/><rect x="50" y="54" width="10" height="8" rx="2"/><rect x="66" y="54" width="10" height="8" rx="2"/>
<rect x="34" y="70" width="10" height="8" rx="2"/><rect x="66" y="70" width="10" height="8" rx="2"/></g>
<rect x="50" y="70" width="10" height="8" rx="2" fill="#7FA36E"/>''',
}
os.makedirs(os.path.join(root, 'assets/img/words'), exist_ok=True)
for k, v in icons.items():
    open(os.path.join(root, f'assets/img/words/{k}.svg'), 'w').write(wrap(v, k))

def scene(inner, title):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="{title}">
<title>{title}</title>
{inner}
</svg>
'''
SS = f'stroke="{INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"'
scenes = {
'desk': ('辦公桌上有打開的筆電，旁邊有一盆植物，前面有一張椅子', f'''<rect width="320" height="200" fill="#F4ECDF"/><rect y="150" width="320" height="50" fill="#E2D2BC"/>
<rect x="60" y="100" width="200" height="12" rx="2" fill="#B9774F" {SS}/><path d="M70 112v52M250 112v52" {SS}/>
<rect x="110" y="62" width="70" height="40" rx="3" fill="#5A4636" {SS}/><rect x="115" y="67" width="60" height="30" fill="#BFDDF0"/>
<path d="M100 102h90l-6-0" {SS}/><rect x="100" y="98" width="90" height="4" fill="#8E9AAF" {SS}/>
<path d="M205 100l4-22h22l4 22z" fill="#C9A27E" {SS}/><path d="M220 78c-10-18-24-16-26-30 14 2 22 10 26 24 2-16 12-26 26-28-2 16-14 22-26 34z" fill="#7FA36E" {SS}/>
<path d="M130 180v-36h36v36M130 144h36" fill="none" {SS}/><rect x="126" y="140" width="44" height="10" rx="3" fill="#8DB3D9" {SS}/>'''),
'shelf': ('牆上有時鐘，下面的書架上排著書', f'''<rect width="320" height="200" fill="#F4ECDF"/><rect y="170" width="320" height="30" fill="#E2D2BC"/>
<circle cx="160" cy="38" r="22" fill="#FFFFFF" stroke="{INK}" stroke-width="3.5"/><path d="M160 38V24M160 38l10 6" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
<rect x="70" y="70" width="180" height="100" fill="#C9A27E" {SS}/><path d="M70 120h180" {SS}/>
<g {SS}><rect x="82" y="80" width="12" height="40" fill="#D9644A"/><rect x="96" y="84" width="10" height="36" fill="#8DB3D9"/><rect x="108" y="78" width="14" height="42" fill="#7FA36E"/><rect x="124" y="86" width="10" height="34" fill="#E2B865"/><rect x="136" y="80" width="12" height="40" fill="#A07CC8"/>
<rect x="170" y="130" width="12" height="40" fill="#8DB3D9"/><rect x="184" y="134" width="12" height="36" fill="#D9644A"/><rect x="198" y="128" width="14" height="42" fill="#E2B865"/><rect x="214" y="132" width="10" height="38" fill="#7FA36E"/></g>'''),
'meeting-room': ('沒有人的會議室：桌上有杯子，周圍有椅子，牆上有白板', f'''<rect width="320" height="200" fill="#F4ECDF"/><rect y="150" width="320" height="50" fill="#E2D2BC"/>
<rect x="100" y="20" width="120" height="60" rx="3" fill="#FFFFFF" {SS}/><path d="M112 36h50M112 48h70M112 60h40" stroke="#C9C9C9" stroke-width="2.5" stroke-linecap="round"/>
<g {SS} fill="#8DB3D9"><path d="M60 130v-34h26v34"/><path d="M234 130v-34h26v34"/></g>
<ellipse cx="160" cy="128" rx="100" ry="22" fill="#B9774F" {SS}/><path d="M80 140v30M240 140v30" {SS}/>
<g {SS} fill="#FFFFFF"><path d="M120 112h14l-2 12h-10z"/><path d="M156 108h14l-2 12h-10z"/><path d="M192 112h14l-2 12h-10z"/></g>'''),
'park': ('晴天的公園：一輛腳踏車停在樹旁邊，附近有一張長椅，沒有人', f'''<rect width="320" height="200" fill="#DCEBF2"/><circle cx="270" cy="36" r="18" fill="#F2CC5B"/>
<rect y="140" width="320" height="60" fill="#B7D49A"/>
<rect x="96" y="80" width="16" height="74" fill="#8A5A3B" {SS}/><circle cx="104" cy="66" r="40" fill="#7FA36E" {SS}/>
<g {SS} fill="none"><circle cx="138" cy="152" r="14"/><circle cx="184" cy="152" r="14"/><path d="M138 152l14-24h22l10 24M152 128l10 24h12M160 128h14M172 124h8"/></g>
<rect x="216" y="128" width="70" height="8" rx="2" fill="#C9A27E" {SS}/><rect x="216" y="114" width="70" height="8" rx="2" fill="#C9A27E" {SS}/><path d="M224 136v18M278 136v18" {SS}/>'''),
}
os.makedirs(os.path.join(root, 'assets/img/scenes'), exist_ok=True)
for k, (title, inner) in scenes.items():
    open(os.path.join(root, f'assets/img/scenes/{k}.svg'), 'w').write(scene(inner, title))
print('ok')
