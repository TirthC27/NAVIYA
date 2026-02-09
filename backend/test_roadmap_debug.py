import httpx
import json

BASE = "http://localhost:8000"
USER_ID = "cded6979-e0c1-41c5-8064-0527612d2544"

print("=" * 60)
print("1. Testing generate endpoint...")
print("=" * 60)

try:
    r = httpx.post(f"{BASE}/api/skill-roadmap/generate",
        json={"user_id": USER_ID, "career_goal": "Network Engineer"},
        timeout=90)
    print(f"Status: {r.status_code}")
    d = r.json()
    if r.status_code == 200:
        print(f"Success: {d.get('success')}")
        rm = d.get("roadmap", {})
        nodes = rm.get("nodes", [])
        links = rm.get("links", [])
        print(f"Nodes: {len(nodes)}, Links: {len(links)}")
        print(f"Summary: {rm.get('summary', 'N/A')[:100]}")
        for n in nodes[:5]:
            print(f"  id={n['id']} step={n.get('step')} status={n.get('status')} label={n.get('label')}")
    else:
        print(f"Error: {json.dumps(d, indent=2)[:500]}")
except Exception as e:
    print(f"EXCEPTION: {type(e).__name__}: {e}")

print()
print("=" * 60)
print("2. Testing history endpoint...")
print("=" * 60)

try:
    r = httpx.get(f"{BASE}/api/skill-roadmap/history/{USER_ID}", timeout=15)
    print(f"Status: {r.status_code}")
    d = r.json()
    h = d.get("history", [])
    print(f"History count: {len(h)}")
    for item in h[:3]:
        print(f"  id={item['id'][:8]}... goal={item['career_goal']} has={item.get('has_count')} miss={item.get('missing_count')}")
except Exception as e:
    print(f"EXCEPTION: {type(e).__name__}: {e}")
