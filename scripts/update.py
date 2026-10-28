import datetime,json,os,time,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'data';OUT.mkdir(exist_ok=True)
HEAD={'User-Agent':'LaplacesOfficerResearchObservatory/1.0 (public academic research)'}
def get(url):
 req=urllib.request.Request(url,headers=HEAD)
 with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
items={}
queries=['predictive policing','algorithmic policing','automated license plate recognition','police surveillance accountability']
for q in queries:
 try:
  u='https://api.openalex.org/works?'+urllib.parse.urlencode({'search':q,'filter':'from_publication_date:2023-01-01','per-page':30})
  for w in get(u).get('results',[]):
   title=w.get('display_name');url=w.get('doi') or w.get('id')
   if title and url:items[url]={'title':title,'url':url,'year':w.get('publication_year'),'source':'OpenAlex'}
 except Exception as e:print('OpenAlex failed',q,e)
 time.sleep(1)
try:
 u='https://api.crossref.org/works?'+urllib.parse.urlencode({'query.title':'predictive policing surveillance','rows':60,'filter':'from-pub-date:2023-01-01'})
 for w in get(u).get('message',{}).get('items',[]):
  title=(w.get('title') or [''])[0];url=w.get('URL');year=((w.get('published') or {}).get('date-parts') or [[None]])[0][0]
  if title and url:items.setdefault(url,{'title':title,'url':url,'year':year,'source':'Crossref'})
except Exception as e:print('Crossref failed',e)
path=OUT/'research.json'
if items:
 path.write_text(json.dumps({'updated':datetime.datetime.now(datetime.timezone.utc).isoformat(),'items':sorted(items.values(),key=lambda x:x.get('year') or 0,reverse=True)},indent=2),encoding='utf-8')
 print('Saved',len(items),'records')
else:
 print('No successful data returned; retaining previous snapshot')
