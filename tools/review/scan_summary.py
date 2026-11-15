import json, sys, statistics as st
# python3 tools/review/scan_summary.py <scan.json> : the worst costumes for skin through cloth, hollow insides and feet off the ground
d=json.load(open(sys.argv[1]))
ok={k:v for k,v in d.items() if isinstance(v,list)}; bad={k:v for k,v in d.items() if not isinstance(v,list)}
print(len(ok),'costumes scanned;',len(bad),'failed',list(bad.items())[:2])
CM2=lambda px,r: px*(r['px']*100)**2   # pixels -> square centimetres
rows=[]
for k,recs in ok.items():
    for r in recs:
        for vn,v in r['v'].items():
            for cls,p in v['poke'].items():
                rows.append((k,r['tag'],vn,cls,p,CM2(p,r),100.0*p/max(1,v['gar'].get(cls,1))))
# 1. poke-through by garment class: how many costumes show more than X cm2 standing still, seen from the front or back
STILL=('stand',)
def worst(filter_tag,filter_view,cls):
    best={}
    for k,tag,vn,c,p,cm,pc in rows:
        if c!=cls or not filter_tag(tag) or not filter_view(vn): continue
        if k not in best or cm>best[k][0]: best[k]=(cm,tag,vn,pc)
    return best
out={}
for cls in ('torso','shoulder','skirt','fore','shin'):
    b=worst(lambda t:t=='stand',lambda v:v in('front','back','left','right'),cls)
    a=worst(lambda t:True,lambda v:True,cls)
    vals=sorted(a.items(),key=lambda kv:-kv[1][0])
    print('\n== skin in front of its',cls,'garment == costumes wearing one:',len(a),'| standing still: >10 cm2 on',sum(1 for x in b.values() if x[0]>10),', >30 cm2 on',sum(1 for x in b.values() if x[0]>30),'| any pose: >30 cm2 on',sum(1 for x in a.values() if x[0]>30),', >60 cm2 on',sum(1 for x in a.values() if x[0]>60))
    for k,(cm,tag,vn,pc) in vals[:10]: print('   %-28s %6.0f cm2  %-12s %-7s (%.0f%% of the garment seen) | standing: %.0f cm2'%(k,cm,tag,vn,pc,b.get(k,(0,))[0]))
    out[cls]={k:{'cm2':round(cm),'tag':tag,'view':vn,'pct':round(pc,1),'stand':round(b.get(k,(0,))[0])} for k,(cm,tag,vn,pc) in vals}
# 2. holes: the inside of the body showing
H=[]; S=[]
for k,recs in ok.items():
    for r in recs:
        for vn,v in r['v'].items():
            H.append((CM2(v['hole'],r),k,r['tag'],vn)); S.append((CM2(v['holeShell'],r),k,r['tag'],vn))
def top(L,n=12):
    best={}
    for cm,k,tag,vn in L:
        if k not in best or cm>best[k][0]: best[k]=(cm,tag,vn)
    return sorted(best.items(),key=lambda kv:-kv[1][0])
th=top(H); ts=top(S)
print('\n== inside of the body seen == >40 cm2 in some pose on',sum(1 for k,x in th if x[0]>40),'costumes; >80 on',sum(1 for k,x in th if x[0]>80))
for k,(cm,tag,vn) in th[:12]: print('   %-28s %6.0f cm2  %-12s %s'%(k,cm,tag,vn))
print('\n== inside of armour seen == >60 cm2 on',sum(1 for k,x in ts if x[0]>60),'costumes')
for k,(cm,tag,vn) in ts[:8]: print('   %-28s %6.0f cm2  %-12s %s'%(k,cm,tag,vn))
out['hole']={k:{'cm2':round(cm),'tag':tag,'view':vn} for k,(cm,tag,vn) in th}; out['shell']={k:{'cm2':round(cm),'tag':tag,'view':vn} for k,(cm,tag,vn) in ts}
# holes by pose (median over costumes of the worst view)
bypose={}
for cm,k,tag,vn in H: bypose.setdefault(tag,{}).setdefault(k,0); bypose[tag][k]=max(bypose[tag][k],cm)
print('\nholes by pose (median / max over costumes, cm2):',' '.join('%s %.0f/%.0f'%(t,st.median(x.values()),max(x.values())) for t,x in sorted(bypose.items(),key=lambda kv:-st.median(kv[1].values()))[:14]))
# 3. ground: lowest point per pose
G={}
for k,recs in ok.items():
    for r in recs: G.setdefault(r['tag'],[]).append((r['minY'],k))
print('\n== lowest point by pose (metres; ground is 0) ==')
for tag,L in sorted(G.items(),key=lambda kv:min(x[0] for x in kv[1])):
    v=[x[0] for x in L]; lo=min(L)
    if min(v)<-0.015 or st.median(v)>0.03: print('   %-12s median %+.3f  lowest %+.3f (%s)  highest %+.3f | below -2 cm on %d of %d'%(tag,st.median(v),lo[0],lo[1],max(v),sum(1 for x in v if x<-0.02),len(v)))
out['ground']={tag:{'median':st.median([x[0] for x in L]),'min':min(L)[0],'who':min(L)[1],'n_sunk':sum(1 for x in L if x[0]<-0.02),'n':len(L)} for tag,L in G.items()}
if len(sys.argv)>2: json.dump(out,open(sys.argv[2],'w'),indent=0)
