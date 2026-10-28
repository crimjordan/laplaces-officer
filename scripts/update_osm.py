import datetime,json,time,urllib.parse,urllib.request
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'data'/'surveillance.json'
places={'Omaha, Nebraska':(41.2565,-95.9345),'Lincoln, Nebraska':(40.8136,-96.7026),'Denver, Colorado':(39.7392,-104.9903)}
results=[]
for name,(lat,lon) in places.items():
 # Overpass query: count mapped surveillance-tagged nodes within 10 km; not an inventory.
 q=f'[out:json][timeout:40];node(around:10000,{lat},{lon})["surveillance"];out count;'
 try:
  req=urllib.request.Request('https://overpass.kumi.systems/api/interpreter',data=urllib.parse.urlencode({'data':q}).encode(),headers={'User-Agent':'LaplacesOfficer/1.0'})
  with urllib.request.urlopen(req,timeout=60) as r:payload=json.load(r)
  count=int(payload['elements'][0]['tags'].get('nodes','0'))
  results.append({'name':name,'count':count,'radius_km':10,'source':'OpenStreetMap / Overpass'})
 except Exception as e:print('Failed',name,e)
 time.sleep(2)
if results:
 out.parent.mkdir(exist_ok=True)
 out.write_text(json.dumps({'updated':datetime.datetime.now(datetime.timezone.utc).isoformat(),'places':results},indent=2))
else:print('No valid counts; retaining previous snapshot')
