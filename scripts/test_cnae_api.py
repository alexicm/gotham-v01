import urllib.request
import urllib.error
import json

TOKEN = "19C29E4629A-52E796F1F871E229-4EM1Y4PRDMIILYE8SG1IK0N9S4QW66AJ"
BASE  = "https://api.listacnae.com.br"

PAYLOAD = {
    "inicio": 0,
    "quantidade": 5,
    "cnaes": [8630504],
    "estados": ["DF"],
}

BASES = [
    "https://listacnae.com.br/api/v1",
    "https://listacnae.com.br/api",
    "https://api.listacnae.com.br/v1",
    "https://api.listacnae.com.br",
]

def test(label: str, method: str, url: str, body=None, extra_headers=None):
    print(f"\n{'='*60}")
    print(f"TESTE: {label}")
    print(f"  {method} {url}")
    h = {"Accept": "application/json"}
    if extra_headers:
        h.update(extra_headers)
    data = json.dumps(body).encode() if body else None
    if data:
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read().decode()
            ct = r.headers.get("Content-Type", "")
            print(f"  Status: {r.status} | CT: {ct[:40]}")
            print(f"  Resposta: {raw[:200]}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        print(f"  HTTP {e.code}: {raw[:200]}")
    except Exception as ex:
        print(f"  EXCEPTION: {ex}")

import urllib.parse

auth = {"Authorization": f"Bearer {TOKEN}"}

# ENDPOINT CONFIRMADO: GET https://api.listacnae.com.br/v1/buscar
# Retornou 400 com JSON real - parametros devem ir como query string

# 1) Query string com inicio, quantidade (sem arrays JSON, sem cnaes/estados)
qs1 = urllib.parse.urlencode({"inicio": 0, "quantidade": 5})
test("GET /v1/buscar?inicio&quantidade (sem filtros)", "GET",
    f"{BASE}/v1/buscar?{qs1}", extra_headers=auth)

# 2) cnaes como lista separada por virgula
qs2 = urllib.parse.urlencode({"inicio": 0, "quantidade": 5,
    "cnaes": "8630504", "estados": "DF"})
test("GET /v1/buscar?cnaes=num&estados=UF", "GET",
    f"{BASE}/v1/buscar?{qs2}", extra_headers=auth)

# 3) cnaes como JSON array na query string
qs3 = urllib.parse.urlencode({"inicio": 0, "quantidade": 5,
    "cnaes": json.dumps([8630504]), "estados": json.dumps(["DF"])})
test("GET /v1/buscar?cnaes=JSON&estados=JSON", "GET",
    f"{BASE}/v1/buscar?{qs3}", extra_headers=auth)

# 4) cnaes repetido (multi-value)
qs4 = "inicio=0&quantidade=5&cnaes=8630504&estados=DF"
test("GET /v1/buscar?cnaes=num plain", "GET",
    f"{BASE}/v1/buscar?{qs4}", extra_headers=auth)

# 5) /v1/creditosAtivos
test("GET /v1/creditosAtivos | Bearer", "GET",
    f"{BASE}/v1/creditosAtivos", extra_headers=auth)

# 6) corpo JSON no GET /v1/buscar
test("GET /v1/buscar body JSON", "GET", f"{BASE}/v1/buscar",
    body=PAYLOAD, extra_headers=auth)
