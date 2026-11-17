import os, sys
out=sys.argv[1]; INK='#4E3424'
colors={'red':'#D9483B','blue':'#3E7CC9','yellow':'#F2C93B','green':'#5FA35A','white':'#FFFFFF','black':'#2B2420','pink':'#F29BB8','brown':'#8A5A3B'}
for k,c in colors.items():
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="{k}">
<title>{k}</title>
<circle cx="60" cy="60" r="56" fill="#F4ECDF"/>
<ellipse cx="60" cy="98" rx="30" ry="4" fill="#E6D8C6"/>
<path d="M60 22c14 0 22 8 30 14s12 16 8 28-4 18-14 24-24 6-34 2-20-10-24-22 0-24 8-32 12-14 26-14z" fill="{c}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M44 40c4-5 10-8 16-8" fill="none" stroke="#FFFFFF" stroke-opacity="{0.25 if k=='white' else 0.55}" stroke-width="5" stroke-linecap="round"/>
<circle cx="92" cy="90" r="6" fill="{c}" stroke="{INK}" stroke-width="2.5"/>
</svg>
'''
    open(os.path.join(out,k+'.svg'),'w').write(svg)
print('ok')
