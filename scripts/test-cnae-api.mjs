/**
 * Testa a Lista CNAE API diretamente com o token configurado.
 * Execute com: node scripts/test-cnae-api.mjs
 */

const TOKEN = process.env.LISTA_CNAE_TOKEN || '19C29E4629A-52E796F1F871E229-4EM1Y4PRDMIILYE8SG1IK0N9S4QW66AJ'
const BASE = 'https://listacnae.com.br/api/v1'

async function testar(label, url, options = {}) {
  console.log(`\n=== ${label} ===`)
  console.log('URL:', url)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      ...options,
    })
    const text = await res.text()
    console.log('Status:', res.status)
    console.log('Content-Type:', res.headers.get('content-type'))
    console.log('Resposta (primeiros 800 chars):')
    console.log(text.substring(0, 800))
  } catch (err) {
    console.log('ERRO:', err.message)
  }
}

// 1. Verificar creditos ativos
await testar('Creditos Ativos', `${BASE}/creditosAtivos`)

// 2. Busca basica — CNAE 8630504 (clinicas medicas)
const params1 = new URLSearchParams({
  cnaes: JSON.stringify([8630504]),
  inicio: '0',
  quantidade: '5',
})
await testar('Busca CNAE 8630504', `${BASE}/buscar?${params1}`)

// 3. Busca com estado DF
const params2 = new URLSearchParams({
  cnaes: JSON.stringify([8630504]),
  estados: JSON.stringify(['DF']),
  inicio: '0',
  quantidade: '5',
})
await testar('Busca CNAE 8630504 + DF', `${BASE}/buscar?${params2}`)

// 4. Teste sem o prefixo /api/v1 — talvez a URL base seja diferente
await testar('Creditos sem /api/v1', 'https://listacnae.com.br/creditosAtivos')
