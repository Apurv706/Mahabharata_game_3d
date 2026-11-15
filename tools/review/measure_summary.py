# python3 tools/review/measure_summary.py <measure.json> : the models' proportions beside the survey (tools/review/survey.json)
import json, sys, os, bisect, statistics as st
d = json.load(open(sys.argv[1])); S = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'survey.json')))
ms = [m for m in d.values() if 'err' not in m]
F = ('draupadi', 'kunti', 'gandhari', 'healer', 'villager_f', 'player_f'); isf = lambda m: any(m['model'].startswith(x) for x in F)
groups = {'grown men': [m for m in ms if not isf(m) and m['stage'] == 'adult'], 'old men': [m for m in ms if not isf(m) and m['stage'] == 'elder'], 'youths': [m for m in ms if not isf(m) and m['stage'] == 'youth'], 'women': [m for m in ms if isf(m) and m['stage'] != 'child'], 'children': [m for m in ms if m['stage'] == 'child']}
print('heads tall:', ', '.join('%s %.2f' % (g, st.median(m['headsTall'] for m in L)) for g, L in groups.items() if L))
for g, L in groups.items():
    if not L: continue
    sex = 'female' if g == 'women' else 'male'; print('\n%s (%d models) beside %s soldiers; each measure as a share of height' % (g, len(L), format(S['n'][sex], ',')))
    for k, ref in S[sex].items():
        if not isinstance(ref, dict): continue
        o = st.median(m[k] / m['H'] for m in L); q = ref['q']
        print('  %-10s ours %.3f (%.3f to %.3f) | survey mean %.3f, %.3f to %.3f | ours = %.2f x the mean, percentile %d' % (k, o, min(m[k] / m['H'] for m in L), max(m[k] / m['H'] for m in L), ref['mean'], q[0], q[100], o / ref['mean'], min(100, bisect.bisect_left(q, o))))
