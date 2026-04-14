import urllib.request
import urllib.error
import json

TOKEN = "19C29E4629A-52E796F1F871E229-4EM1Y4PRDMIILYE8SG1IK0N9S4QW66AJ"
BASE  = "https://listacnae.com.br/api/v1"

PAYLOAD = {
    "inicio": 0,
    "quantidade": 5,
    "cnaes": [8630504],
    "estados": ["DF"],
}


def test(label: str, method: str, url: str, body=None, headers=None):
    print(f"\n{'='*60}")
    print(f"TESTE: {label}")
    print(f"  {method} {url}")
    if body:
        print(f"  Body: {json.dumps(body)[:120]}")
    h = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}
    if headers:
        h.update(headers)

    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read().decode()
            print(f"  Status: {r.status}")
            print(f"  Content-Type: {r.headers.get('Content-Type')}")
            print(f"  Resposta (300 chars): {raw[:300]}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        print(f"  HTTP ERROR {e.code}: {raw[:300]}")
    except Exception as ex:
        print(f"  EXCEPTION: {ex}")


# 1) GET com body JSON (conforme doc diz "requisicoes JSON")
test(
    "GET + body JSON",
    "GET", f"{BASE}/buscar",
    body=PAYLOAD,
    headers={"Content-Type": "application/json"},
)

# 2) POST com body JSON
test(
    "POST + body JSON",
    "POST", f"{BASE}/buscar",
    body=PAYLOAD,
    headers={"Content-Type": "application/json"},
)

# 3) GET com query string (arrays como JSON)
import urllib.parse
qs = urllib.parse.urlencode({
    "inicio": 0,
    "quantidade": 5,
    "cnaes": json.dumps([8630504]),
    "estados": json.dumps(["DF"]),
})
test(
    "GET + query string (JSON arrays)",
    "GET", f"{BASE}/buscar?{qs}",
)

# 4) GET creditos (sem payload)
test(
    "GET /creditosAtivos",
    "GET", f"{BASE}/creditosAtivos",
)

# 5) Testar base URL alternativa (sem /api/v1)
test(
    "GET + body JSON (base sem /api/v1)",
    "GET", "https://listacnae.com.br/buscar",
    body=PAYLOAD,
    headers={"Content-Type": "application/json"},
)
