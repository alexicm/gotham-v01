# Loading Screen + Módulo Admin + CNPJ Lookup — Design Spec

> Três subsistemas independentes implementados em sequência: Loading Screen → Admin → CNPJ Lookup.

---

## Subsistema 1: Loading Screen

### Objetivo
Exibir uma tela de carregamento animada por 3 segundos (ou até a verificação de sessão terminar, o que demorar mais) toda vez que o sistema inicializa.

### Componente
`components/LoadingScreen.tsx`

### Visual
- Fundo: `#d4c4a8` (bege do desktop)
- SVG: triângulo com stroke `#d97706` (âmbar do sistema)
- Animação `dash`: `stroke-dasharray: 17`, `stroke-dashoffset` animado até 136, duração 2.5s, `cubic-bezier(0.35, 0.04, 0.63, 0.95)`, infinito
- Texto "Carregando..." em `Geist Mono`, 12px, animação `blink` 0.9s (opacity 0 em 50%), cor `#2c2416`
- Subtexto `GOTHAM v0.1` abaixo, 10px, cor `#8a7a5a`
- Layout: centralizado verticalmente e horizontalmente, tela cheia (`100vw × 100vh`)

### SVG base
```svg
<svg width="200" height="200" viewBox="0 0 40 60">
  <polygon class="triangle" fill="none" stroke="#d97706" stroke-width="1"
    points="16,1 32,32 1,32" />
  <text class="loading" x="0" y="45" fill="#2c2416">Carregando...</text>
</svg>
```

### Lógica no `app/page.tsx`
```typescript
const [loading, setLoading] = useState(true)

useEffect(() => {
  const timer = setTimeout(() => setLoading(false), 3000)
  return () => clearTimeout(timer)
}, [])

// Verificação de sessão corre em paralelo (useEffect separado, existente)
// Quando ambos terminam (loading=false E sessão verificada), a tela real aparece

if (loading) return <LoadingScreen />
```

O timer de 3s e a verificação de sessão correm em paralelo. O loading só some quando **ambos** terminarem — ou seja, `loading === false && sessionChecked === true`.

---

## Subsistema 2: Módulo Admin

### Objetivo
Permitir que Admins criem e gerenciem usuários do sistema, configurando nível de acesso (Admin/Agente) e módulos permitidos por usuário.

### Banco de dados

**Migração `004_admin.sql`:**

```sql
-- Adicionar colunas em perfis
ALTER TABLE perfis
  ADD COLUMN nivel text NOT NULL DEFAULT 'agente'
    CHECK (nivel IN ('admin', 'agente')),
  ADD COLUMN modulos_permitidos text[] NOT NULL
    DEFAULT ARRAY['busca', 'cnpj'];

-- RLS: admin pode ler/editar todos os perfis
-- (agente só vê o próprio — política existente mantida)
CREATE POLICY "admin_pode_ler_todos" ON perfis
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM perfis p
      WHERE p.id = auth.uid() AND p.nivel = 'admin'
    )
  );

CREATE POLICY "admin_pode_atualizar_todos" ON perfis
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM perfis p
      WHERE p.id = auth.uid() AND p.nivel = 'admin'
    )
  );
```

**Módulos válidos (constante no código):**
```typescript
export const MODULOS = ['busca', 'terminal', 'cnpj', 'admin'] as const
export type Modulo = typeof MODULOS[number]
```

**Padrões por nível:**
- `admin`: acesso implícito a todos os módulos (ignorar `modulos_permitidos`)
- `agente`: padrão `['busca', 'cnpj']`, customizável pelo Admin

### Hook `usePermissoes`

**Arquivo:** `hooks/usePermissoes.ts`

```typescript
export function usePermissoes() {
  // Lê perfil do usuário logado via supabase.auth.getUser() + query em perfis
  // Retorna:
  return {
    nivel: 'admin' | 'agente',
    podeAcessar: (modulo: Modulo) => boolean,
    carregando: boolean,
  }
}
// Admin sempre retorna true em podeAcessar(), independente do array
```

### Rota de API

**`app/api/admin/usuarios/route.ts`**
- `GET` — lista todos os perfis (somente admin, validado server-side via service_role)
- `POST` — cria usuário: `supabase.auth.admin.createUser()` + INSERT em `perfis`

**`app/api/admin/usuarios/[id]/route.ts`**
- `PATCH` — atualiza `nivel`, `modulos_permitidos`, `ativo`
- `DELETE` — desativa usuário (`ativo = false`), não exclui do auth

### Rota `/admin` (painel completo)

**`app/admin/page.tsx`** — layout próprio estilo Gotham (bege, Geist Mono, bordas âmbar).

Middleware bloqueia acesso se `nivel !== 'admin'` — redireciona para `/`.

**Seções:**

1. **Tabela de usuários**
   - Colunas: Nome, CPF, Nível, Módulos, Status (Ativo/Inativo), Ações
   - Ações: Editar (abre modal), Ativar/Desativar

2. **Modal criar/editar usuário**
   - Campos: Nome completo, CPF, Código de acesso (só na criação), Nível (radio: Admin/Agente)
   - Módulos: checkboxes `busca | terminal | cnpj | admin`
   - Ao selecionar nível, pré-marca os módulos padrão (customizável)
   - Botões: Salvar / Cancelar

### Janela desktop `AdminWindow`

**`components/windows/AdminWindow.tsx`** — janela simplificada no OS desktop.

Conteúdo:
- Lista de usuários em tabela compacta (nome, nível, status)
- Botão "Ativar/Desativar" por linha
- Botão "Abrir painel completo →" que faz `window.open('/admin', '_blank')`

**Acesso:** visível somente para `nivel === 'admin'`.
- Ícone no desktop: `admin_panel` com ícone `ShieldCheck` âmbar
- Item no menu superior: "Admin"

### Controle de acesso no desktop

Em `CnaeDesktop.tsx`, usar `usePermissoes()`:
- Ícones do desktop e itens de menu condicionados a `podeAcessar(modulo)`
- Tentativa de abrir janela sem permissão é silenciosamente ignorada

---

## Subsistema 3: CNPJ Lookup

### Objetivo
Janela dedicada para consulta avulsa de CNPJ, exibindo todos os dados retornados pela API.

### Componente
`components/windows/CnpjWindow.tsx`

### Acesso no desktop
- Ícone no desktop: `cnpj_lookup` com ícone `Search` âmbar
- Item no menu superior: "CNPJ"
- Controlado por `podeAcessar('cnpj')`

### Layout

**Topo — campo de busca**
- Input com máscara: `XX.XXX.XXX/XXXX-XX` (formatar com `formatCNPJ` existente)
- Validação com `isValidCNPJ()` existente em `lib/formatters.ts`
- Botão "Consultar" + estado de loading (spinner inline)
- Erro inline: "CNPJ inválido", "Não encontrado", "Erro de consulta"

**Estado vazio**
- Ícone centralizado + texto "Digite um CNPJ para consultar"

**Resultado — abas**

| Aba | Campos |
|-----|--------|
| **Geral** | Razão social, nome fantasia, situação (badge colorido), CNAE principal + descrição, data de abertura, porte, capital social, Simples Nacional (S/N), MEI (S/N) |
| **Endereço** | Logradouro + número + complemento, bairro, CEP, município, UF |
| **Contato** | E-mail, telefone |
| **Sócios** | Tabela: nome, qualificação, data de entrada na sociedade |
| **CNAEs** | CNAE principal destacado + lista de CNAEs secundários (código + descrição) |

### Dados
- Reutiliza `GET /api/cnpj/[cnpj]` — sem rota nova
- Tipo de retorno: `EmpresaBrasilAPI` (já em `types/empresa.ts`)
- Cache Supabase de 7 dias já ativo na rota existente

### Dimensões da janela
- Largura: 600px, Altura: 580px

---

## Ordem de implementação

1. **Loading Screen** — sem dependência, menor risco
2. **Banco (migração 004)** — fundação do Admin
3. **Hook `usePermissoes`** — fundação do controle de acesso
4. **Rotas de API admin** — CRUD de usuários
5. **Rota `/admin`** — painel completo
6. **`AdminWindow`** no desktop — janela simplificada
7. **Controle de acesso no desktop** — aplicar `podeAcessar()` nas janelas existentes
8. **`CnpjWindow`** — novo módulo de lookup
