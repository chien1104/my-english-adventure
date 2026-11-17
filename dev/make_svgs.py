import os, sys
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
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
art = {
'apple': ('apple', f'''<path d="M60 44c-9-7-29-6-33 11-4 18 8 38 21 40 6 1 9-2 12-2s6 3 12 2c13-2 25-22 21-40-4-17-24-18-33-11z" fill="#D9644A" {S}/>
<path d="M60 44c0-8 2-13 6-17" fill="none" {S}/>
<path d="M66 32c5-6 13-7 17-4-3 6-11 8-17 4z" fill="#8DAA6B" {S}/>
<path d="M40 58c1-5 4-8 8-9" fill="none" stroke="#F7C9B8" stroke-width="3" stroke-linecap="round"/>'''),
'banana': ('banana', f'''<path d="M30 46c4 28 26 44 56 34 4-2 4-6 0-6-22 4-38-10-44-30-2-6-13-6-12 2z" fill="#F2CC5B" {S}/>
<path d="M30 46l-4-6 6-2" fill="#8C6A3E" {S}/>
<path d="M86 80l6 2" {S}/>
<path d="M44 52c6 14 18 22 32 22" fill="none" stroke="#D9A93A" stroke-width="2.5" stroke-linecap="round"/>'''),
'bread': ('bread', f'''<path d="M26 92V60c-6-2-8-8-6-14 3-9 16-14 40-14s37 5 40 14c2 6 0 12-6 14v32z" fill="#E2B074" {S}/>
<path d="M30 60h60" fill="none" stroke="#C48A4E" stroke-width="2.5" stroke-linecap="round"/>
<path d="M44 44l6 8M58 42l6 8M72 44l6 8" fill="none" stroke="#B57A42" stroke-width="3" stroke-linecap="round"/>'''),
'egg': ('egg', f'''<path d="M60 26c-16 0-28 26-28 44 0 16 12 26 28 26s28-10 28-26c0-18-12-44-28-44z" fill="#FFF6E6" {S}/>
<path d="M46 52c2-8 6-14 10-16" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>'''),
'milk': ('milk', f'''<path d="M42 40l8-14h20l8 14v54H42z" fill="#FFFFFF" {S}/>
<path d="M42 40h36" fill="none" {S}/>
<path d="M50 26v-4h20v4" fill="#FFFFFF" {S}/>
<path d="M42 60h36v20H42z" fill="#8DB3D9" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M54 70c2-4 6-4 6 0s4 4 6 0" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>'''),
'coffee': ('coffee', f'''<path d="M34 50h44v30c0 8-6 14-14 14H48c-8 0-14-6-14-14z" fill="#B9774F" {S}/>
<path d="M78 58h6c6 0 8 4 8 8s-2 10-10 10h-4" fill="none" {S}/>
<ellipse cx="56" cy="50" rx="22" ry="4" fill="#5A3622" {S}/>
<path d="M48 40c-4-4 4-8 0-14M62 40c-4-4 4-8 0-14" fill="none" stroke="#C9A27E" stroke-width="3" stroke-linecap="round"/>'''),
'water': ('water', f'''<path d="M38 30h44l-6 62c0 3-2 4-4 4H48c-2 0-4-1-4-4z" fill="#FFFFFF" fill-opacity=".6" {S}/>
<path d="M41 52h38l-4 40c0 2-1 3-3 3H48c-2 0-3-1-3-3z" fill="#9CC8E8"/>
<path d="M41 52c6 3 12-3 19 0s13 3 19 0" fill="none" stroke="#5E9CCB" stroke-width="2.5" stroke-linecap="round"/>
<path d="M38 30h44l-6 62c0 3-2 4-4 4H48c-2 0-4-1-4-4z" fill="none" {S}/>
<path d="M48 60v24" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>'''),
'tea': ('tea', f'''<ellipse cx="58" cy="88" rx="30" ry="6" fill="#FFFFFF" {S}/>
<path d="M36 58h44c0 16-8 28-22 28S36 74 36 58z" fill="#FFFFFF" {S}/>
<ellipse cx="58" cy="58" rx="22" ry="4" fill="#C8A04A" {S}/>
<path d="M80 62c8 0 10 4 8 8s-6 6-10 6" fill="none" {S}/>
<path d="M66 58c4-10 10-16 14-18" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>
<rect x="76" y="34" width="12" height="10" rx="2" fill="#8DAA6B" stroke="{INK}" stroke-width="2.5"/>'''),
'bed': ('bed', f'''<path d="M22 50v42M98 66v26" fill="none" {S}/>
<path d="M22 70h76v14H22z" fill="#C9A27E" {S}/>
<path d="M22 70c0-6 4-10 10-10h66v10z" fill="#FFFFFF" {S}/>
<rect x="26" y="52" width="22" height="12" rx="6" fill="#F4ECDF" {S}/>
<path d="M50 60h48v10H50z" fill="#8DB3D9" {S}/>'''),
'chair': ('chair', f'''<path d="M42 24h12v40H42z" fill="#C9A27E" {S}/>
<path d="M42 62h40v10H42z" fill="#B9774F" {S}/>
<path d="M46 72v22M78 72v22M54 72v16M70 72v16" fill="none" {S}/>'''),
'door': ('door', f'''<path d="M38 96V24h44v72" fill="#B9774F" {S}/>
<path d="M30 96h60" fill="none" {S}/>
<rect x="45" y="32" width="30" height="24" rx="3" fill="#C9A27E" stroke="{INK}" stroke-width="2.5"/>
<rect x="45" y="62" width="30" height="24" rx="3" fill="#C9A27E" stroke="{INK}" stroke-width="2.5"/>
<circle cx="74" cy="60" r="3.5" fill="#E2B865" stroke="{INK}" stroke-width="2"/>'''),
'window': ('window', f'''<rect x="30" y="28" width="60" height="58" rx="4" fill="#BFDDF0" {S}/>
<path d="M60 28v58M30 57h60" fill="none" {S}/>
<path d="M24 22h72" fill="none" {S}/>
<path d="M26 22c0 20 6 40 12 44-6 0-12-4-12-10z" fill="#E7B9A6" {S}/>
<path d="M94 22c0 20-6 40-12 44 6 0 12-4 12-10z" fill="#E7B9A6" {S}/>
<path d="M26 90h68" fill="none" {S}/>'''),
'book': ('book', f'''<path d="M34 28h48v64H34c-4 0-6-2-6-6V34c0-4 2-6 6-6z" fill="#7FA36E" {S}/>
<path d="M28 86c0-4 2-6 6-6h48" fill="none" {S}/>
<path d="M40 28v52" fill="none" stroke="{INK}" stroke-width="2.5"/>
<rect x="50" y="42" width="24" height="10" rx="2" fill="#F4ECDF" stroke="{INK}" stroke-width="2"/>'''),
'phone': ('phone', f'''<rect x="40" y="20" width="40" height="76" rx="8" fill="#5A4636" {S}/>
<rect x="45" y="30" width="30" height="52" rx="3" fill="#BFDDF0"/>
<circle cx="60" cy="89" r="3" fill="#C9A27E"/>
<path d="M54 25h12" stroke="#C9A27E" stroke-width="2.5" stroke-linecap="round"/>
<rect x="50" y="40" width="8" height="8" rx="2" fill="#F2CC5B"/><rect x="62" y="40" width="8" height="8" rx="2" fill="#D9644A"/>
<rect x="50" y="52" width="8" height="8" rx="2" fill="#7FA36E"/><rect x="62" y="52" width="8" height="8" rx="2" fill="#8DB3D9"/>'''),
'key': ('key', f'''<circle cx="42" cy="56" r="16" fill="#E2B865" {S}/>
<circle cx="42" cy="56" r="6" fill="#F4ECDF" {S}/>
<path d="M58 56h36v8h-6v8h-8v-8h-6v6h-8v-6h-8z" fill="#E2B865" {S}/>'''),
'clock': ('clock', f'''<circle cx="60" cy="58" r="34" fill="#FFFFFF" stroke="{INK}" stroke-width="5"/>
<path d="M60 30v4M60 82v4M32 58h4M84 58h4" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
<path d="M60 58V40M60 58l12 8" fill="none" stroke="{INK}" stroke-width="3.5" stroke-linecap="round"/>
<circle cx="60" cy="58" r="3" fill="#D9644A"/>'''),
}
for k,(title,inner) in art.items():
    open(os.path.join(out, k+'.svg'),'w').write(wrap(inner,title))
print(len(art))
