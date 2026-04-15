# Terminal Melhorias + Startup Fechado + Módulo Perfil — Design Spec

> Quatro subsistemas independentes implementados em sequência.

---

## Subsistema 1: Terminal Melhorias

### 1a — Correções visuais e de texto

**Arquivo:** `components/windows/CnaeTerminalWindow.tsx`

- **neofetch ASCII art**: substituir bloco "CNAE" por "GOTHAM" em letras blocadas âmbar
- **neofetch info**: linha `API: Lista CNAE + BrasilAPI CNPJ` → `Modulos: Busca · CNPJ · Admin` (sem expor stack técnica)
- **neofetch info**: `Shell: cnae-shell 1.0` → `Shell: gotham-shell 1.0`
- **Welcome message**: `'Digite "ajuda" para ver os comandos.'` → `'Digite "help" para ver os comandos.'`
- **HELP array**: renomear `ajuda` → `help`, atualizar listagem com novos comandos
- **Error fallback**: `'Comando nao reconhecido: "...". Digite "ajuda".'` → `'...Digite "help".'`
- **execute()**: manter `command === 'ajuda' || command === 'help'` como aliases (retrocompatível)

### 1b — Novos comandos

**Arquivo:** `components/windows/CnaeTerminalWindow.tsx`
**Rotas novas:** `app/api/terminal/historico/route.ts`, `app/api/terminal/stats/route.ts`

#### `historico [--n=10]`
- Chama `GET /api/terminal/historico?n=10`
- Retorna últimas N entradas de `historico_buscas` do usuário logado
- Output: tabela com data, CNAEs buscados, total de resultados

#### `stats`
- Chama `GET /api/terminal/stats`
- Retorna: total de buscas realizadas, total de empresas encontradas, data da primeira busca
- Output: painel de estatísticas âmbar

#### `exportar`
- Disponível após executar `buscar` — usa os últimos resultados em memória (`lastResults` ref)
- Gera CSV com headers `cnpj,razaoSocial,nomeFantasia,uf,municipio,cnae`
- Faz download via `<a>` temporário com `URL.createObjectURL`
- Sem nova rota de API (processamento client-side)

#### `help <comando>`
- Se `help buscar`: exibe flags detalhadas do buscar
- Se `help ficha`, `help historico`, etc.: exibe explicação expandida
- Se sem argumento: exibe lista completa (comportamento atual)

#### `cls`
- Alias para `limpar` / `clear`

#### Novos flags em `buscar`
- `--simples=S|N` — filtro Simples Nacional
- `--mei=S|N` — filtro MEI
- Adicionados ao `payload` enviado para `/api/busca-cnae` se presentes

### 1c — Gate de senha do terminal

**Arquivo novo:** `components/TerminalPasswordGate.tsx`
**Rota nova:** `app/api/auth/verify-senha/route.ts`

#### Fluxo
1. Usuário clica em ícone/menu "Terminal"
2. Em vez de chamar `openTerminal()` diretamente, chama `openTerminalComGate()`
3. `openTerminalComGate` exibe `TerminalPasswordGate` (modal overlay)
4. Usuário digita seu código de acesso (senha Gotham)
5. POST para `/api/auth/verify-senha` com `{ senha }`
6. API obtém email do usuário atual via `createClient()`, chama `supabase.auth.signInWithPassword({ email, password: senha })` no client normal (não admin — não cria nova sessão, apenas valida)
7. Sucesso → fecha gate, chama `openTerminal()`
8. Erro → mensagem "Código incorreto" inline, campo limpo

#### `TerminalPasswordGate` — visual
```
┌──────────────────────────────┐
│  [Terminal]  Acesso restrito │
│  Digite seu código de acesso │
│  ┌────────────────────────┐  │
│  │ ••••••                 │  │
│  └────────────────────────┘  │
│  [Cancelar]     [Confirmar]  │
│  ❌ Código incorreto          │  ← visível só se erro
└──────────────────────────────┘
```
- Estilo Gotham: bege #f5f1e8, bordas âmbar #c8b888, botão confirmar #fbbf24
- Input type="password", autoFocus, Enter confirma
- `zIndex: 9999` sobre todas as janelas

#### `POST /api/auth/verify-senha`
```typescript
// Recebe: { senha: string }
// 1. createClient() → getUser() para obter email
// 2. createBrowserClient não disponível server-side →
//    usar supabase.auth.admin.getUserById(user.id) para obter email
//    então chamar signInWithPassword com email + senha
// 3. Se erro de auth → 401 { error: 'Código incorreto' }
// 4. Se ok → 200 { ok: true }
```

**Nota de implementação:** `signInWithPassword` no server-side atualiza a sessão se bem-sucedido. Isso é aceitável — apenas refresca o token. Usar `createClient()` (SSR com cookies) para a verificação.

---

## Subsistema 2: Inicialização Fechada

**Arquivo:** `components/CnaeDesktop.tsx`

Remover o `useEffect` que chama `openBusca()` e `openTerminal()` no mount do componente `CnaeDesktopOS`:

```typescript
// REMOVER este bloco:
useEffect(() => {
  openBusca()
  openTerminal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

O desktop inicializa com tela vazia (apenas menu bar e ícones). O usuário abre as janelas manualmente.

---

## Subsistema 3: Módulo de Perfil

### Banco de dados

**Migration `005_perfil.sql`:**
```sql
ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS genero text
    CHECK (genero IN ('m', 'f'));

-- Storage: bucket 'avatars' deve ser criado manualmente no Supabase Dashboard
-- Settings: public bucket, tamanho máximo 2MB, tipos: image/jpeg, image/png, image/webp
```

**RLS para Storage (configuração manual no Dashboard):**
- Usuário pode fazer upload para `avatars/{seu-user-id}`
- Leitura pública do bucket (para exibir foto)

### API

**`PUT /api/perfil`**
- Recebe: `{ nome?: string, genero?: 'm' | 'f', foto_url?: string }`
- Atualiza `perfis` onde `id = auth.uid()`
- Validação: `nome` não pode ser vazio se fornecido, `genero` só 'm' ou 'f'
- Retorna: `{ ok: true }`

**`GET /api/perfil/historico`**
- Retorna últimas 20 entradas de `historico_buscas` do usuário logado
- Campos: `id`, `cnaes`, `params`, `total_resultados`, `criado_em`
- Ordenado por `criado_em DESC`

### Componente `PerfilWindow`

**Arquivo:** `components/windows/PerfilWindow.tsx`
**Dimensões:** 560×520px

#### Visual — pixel border style
Bordas pixeladas 3D usando `box-shadow` multi-layer (técnica do design de referência):
```css
box-shadow:
  0px 3px #e7e7e7,        /* highlight topo */
  0px -3px #d4c4a8,       /* base */
  3px 0px #d4c4a8,        /* lateral dir */
  -3px 0px #d4c4a8,       /* lateral esq */
  0px -6px #b6a695,       /* borda escura bas */
  0px 6px #b6a695,        /* borda escura top */
  6px 0px #b6a695,        /* borda escura dir */
  -6px 0px #b6a695,       /* borda escura esq */
  9px 0px rgba(0,0,0,0.1),/* sombra externa */
  0px 9px rgba(0,0,0,0.1) /* sombra externa */
```
Paleta: manter bege #d4c4a8 / âmbar #fbbf24 / Geist Mono.

#### Layout
```
┌─────────────────────────────────────────┐  ← janela OsWindowFrame
│ perfil.sys                    [─][□][×] │
├─────────────────────────────────────────┤
│                                         │
│  [  Avatar 80px  ]  Nome completo       │
│  [ clique p/ foto ]  editável           │
│                                         │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  ♂ MASCULINO │  │  ♀ FEMININO  │     │  ← pixel boxes, seleção ativa âmbar
│  └──────────────┘  └──────────────┘     │
│                                         │
│  CPF: xxx.xxx.xxx-xx    Nível: ADMIN    │
│  Módulos: busca · terminal · cnpj       │
│                                         │
│                           [ SALVAR ]    │  ← botão pixel âmbar
├─────────────────────────────────────────┤
│  HISTÓRICO DE BUSCAS                    │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄    │
│  15/04  6201500              1.234 emp  │
│  14/04  4751200, 6202300       567 emp  │
│  ...                                    │
└─────────────────────────────────────────┘
```

#### Upload de foto
- Click na área do avatar → `<input type="file" accept="image/*">` oculto
- Upload para `supabase.storage.from('avatars').upload(userId, file, { upsert: true })`
- Após upload: `getPublicUrl()` → atualiza `foto_url` no estado local
- Tamanho máximo: 2MB (validado client-side)
- Fallback: inicial do nome (ex: "A" para "Alex")

### Acesso no desktop

**`components/CnaeDesktop.tsx`:**
- Importar `PerfilWindow` e `User` de lucide-react
- Novo callback `openPerfil` via `upsertWindow('perfil', ...)`
- Menu bar: item "Perfil" (sem filtro de `podeAcessar` — disponível para todos)
- Desktop icon: `perfil.sys` com ícone `User` âmbar (sempre visível, sem guard de módulo)

---

## Ordem de implementação

1. **Startup fechado** — trivial, 1 linha removida
2. **Terminal correções** (neofetch GOTHAM, ajuda→help, textos)
3. **Terminal novos comandos** (rotas + handlers: historico, stats, exportar, cls, help detalhado, flags simples/mei)
4. **Gate de senha do terminal** (TerminalPasswordGate + /api/auth/verify-senha)
5. **Migration 005_perfil.sql** + instrução bucket Storage
6. **Rotas de API do perfil** (PUT /api/perfil + GET /api/perfil/historico)
7. **PerfilWindow component**
8. **Integrar PerfilWindow no CnaeDesktop**
