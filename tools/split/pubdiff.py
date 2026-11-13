import json,os,sys,filecmp,shutil
# What a publish must send, change and remove: the built parts against a folder that mirrors what is published.
#   python3 tools/split/pubdiff.py <split dir> <mirror dir> [--apply]
# <split dir> is the output of tools/split/build.js; <mirror dir> holds p1/ and p2/, each exactly the files the host
# has for that part (published path = path under pN/). Without --apply it only reports. With it, the mirror is brought
# up to date (files no longer published are moved to gone_pN/) and pubdiff_pN.json lists new, changed and gone: send
# the first two and remove the third. Publish from the mirror, never by hand from the build: a file sent under the
# wrong path (hi.js for js/i18n/hi.js) once left the play links with stale Hindi for a day.
args=[a for a in sys.argv[1:] if not a.startswith('--')]; SPLIT,PUB=args[0],args[1]
apply='--apply' in sys.argv
for n in (1,2):
    m=json.load(open(f'{SPLIT}/part{n}.files.json')); pub=f'{PUB}/p{n}'
    have=set()
    for root,ds,fs in os.walk(pub):
        for f in fs:
            rel=os.path.relpath(os.path.join(root,f),pub)
            if rel!='index.html': have.add(rel)
    new=[k for k in m if k not in have]; gone=sorted(have-set(m))
    changed=[k for k in m if k in have and not filecmp.cmp(m[k], os.path.join(pub,k), shallow=False)]
    idx=not filecmp.cmp(f'{SPLIT}/part{n}/index.html', f'{pub}/index.html', shallow=False)
    print(f'part {n}: published now {len(have)+1}; to be {len(m)+1}; new {len(new)}; changed {len(changed)}; gone {len(gone)}; index changed {idx}')
    print('  new:', new); print('  changed:', changed); print('  gone:', gone)
    json.dump({'new':new,'changed':changed,'gone':gone}, open(f'{PUB}/pubdiff_p{n}.json','w'))
    if apply:
        for k in new+changed:
            d=os.path.join(pub,k); os.makedirs(os.path.dirname(d),exist_ok=True); shutil.copyfile(m[k],d)
        shutil.copyfile(f'{SPLIT}/part{n}/index.html', f'{pub}/index.html')
        os.makedirs(f'{PUB}/gone_p{n}',exist_ok=True)
        for k in gone:
            d=os.path.join(f'{PUB}/gone_p{n}',k.replace('/','__')); shutil.move(os.path.join(pub,k), d)
        print('  applied')
