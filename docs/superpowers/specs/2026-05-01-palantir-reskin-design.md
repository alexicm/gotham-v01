# Gotham × Palantir Reskin — Design Spec

**Date:** 2026-05-01
**Status:** Approved (auto mode)
**Reference project:** `~/Projetos/palantir-for-family-trips`

## Goal

Substituir o paradigma "OS desktop amber" do Gotham por um dashboard Palantir-style: dark, denso, utilitário, espelhando a linguagem visual do projeto `palantir-for-family-trips` (DESIGN.md). Aplicar 360°: shell, páginas, login, mobile, primitivos UI.

## Decisões de produto (alinhadas com o usuário)

- **Escopo:** Reskin total. Abandonar desktop+janelas arrastáveis.
- **Layout:** Adaptativo — sidebar + workspace por padrão; inspector rail aparece apenas em Resultados e Intelligence.
- **Stack de estilização:** Tailwind v4 com `@theme` tokens; reescrever markup em classes Tailwind. Inline styles saem.
- **Tipografia:** Geist Sans + Geist Mono (já no projeto). Mono em dados numéricos com `tabular-nums`.
- **Login:** Background grid técnico estático SVG (sem WebGL). FaultyTerminal sai.
- **Mobile:** Reformatado em stack vertical Palantir (cards de módulo, bottom sheet para inspector).

## Design system (tokens)

`app/globals.css` define via `@theme`:

```css
--color-background: #0A0C10
--color-surface: #161B22
--color-surface-2: #1C232C    /* hover/elevated */
--color-muted: #8B949E
--color-primary: #C9D1D9
--color-border: #30363D
--color-border-strong: #4B5563
--color-critical: #F85149
--color-warning: #D29922
--color-success: #3FB950
--color-info: #58A6FF
--color-violet: #A371F7
--radius-sm: 2px
--radius-md: 4px
```

Espaçamento base 4px. Densidade compacta. Bordas mínimas (sharp). Modo dark exclusivo.

## Arquitetura

### Shell

```
components/shell/
  AppShell.tsx       — root: estado de página ativa + entidade selecionada
  TopBar.tsx         — 38px: logo, status, clock, user, refresh, logout
  Sidebar.tsx        — 56px collapsed → 200px hover, ícones + tooltips
  InspectorRail.tsx  — 320px, render condicional por página
```

Estado em `AppShell`:
- `activePage: 'busca' | 'resultados' | 'ficha' | 'intelligence' | 'cnpj' | 'admin' | 'perfil'`
- `selectedEntity: Empresa | null` (para inspector)
- `buscaResult, buscaParams` (compartilhados entre Busca → Resultados → Ficha)

Inspector rail visibilidade:
- Resultados: ✅ ficha resumida da linha selecionada
- Intelligence: ✅ contexto da query
- Demais páginas: ❌ workspace 100%

### Páginas (1:1 com janelas atuais)

`components/pages/`:
- `BuscaPage.tsx` — formulário denso 2 colunas (CNAE/UF | termos/filtros)
- `ResultadosPage.tsx` — tabela densa Palantir-style
- `FichaPage.tsx` — full-width, abas internas
- `IntelligencePage.tsx` — chat + contexto
- `CnpjPage.tsx` — busca + resultado
- `AdminPage.tsx`
- `PerfilPage.tsx`

Lógica de negócio (fetch, enriquecimento, validação) preservada das janelas atuais — apenas markup é reescrito.

### Primitivos UI

`components/ui/`:
- `Table.tsx` — header sticky `#161B22`, rows 32px, separadores `#30363D`, hover/selected
- `Badge.tsx` — variantes semânticas (info/warning/success/critical/violet/muted)
- `Input.tsx` — bg `#0A0C10`, borda `#30363D`, focus `#58A6FF`
- `Button.tsx` — primary (info), secondary (surface), ghost
- `Card.tsx` — `#161B22` + borda `#30363D` + raio 4px
- `Tabs.tsx` — underline accent `#58A6FF`
- `DataCell.tsx` — wrapper para dado mono+tabular-nums com label uppercase

`lib/cn.ts` — helper `cn()` com clsx+tailwind-merge.

### Login

`/login` (atual `LoginScreen.tsx` reescrito):
- Background `#0A0C10` + grid SVG estático (linhas verticais/horizontais a cada 40px em `#161B22`, opacity 0.5)
- Card centralizado 380×auto, `#161B22`, borda `#30363D`, raio 4px
- Header: badge `SYS:AUTH` mono uppercase + divider
- Logo BarChart2 `#58A6FF` + título `GOTHAM` Inter Bold
- Subtítulo `SISTEMA DE INTELIGÊNCIA EMPRESARIAL` mono uppercase muted
- Inputs `#0A0C10` borda `#30363D` focus `#58A6FF`
- Botão entrar bg `#58A6FF` text `#0A0C10`
- Erro `#F85149` em `#F85149/10`
- Footer mono muted

### Mobile

`MobileLayout.tsx` reescrito:
- TopBar 38px (mesma TopBar da desktop)
- Lista vertical de cards de módulo (`#161B22`, borda `#30363D`)
- Cada card: ícone em accent + título + descrição + chevron
- Tap abre página full-screen com back button no top
- Bottom sheet para inspector (Resultados: tap numa linha → sheet com ficha)

### Motion

Framer Motion mínimo:
- Transição de página: fade 150ms
- Inspector rail slide-in: 200ms
- Hover rows/buttons: 100ms
- Sem decorações

## Dependências

**Adicionar:**
- `clsx`
- `tailwind-merge`
- `framer-motion`

**Remover:**
- `ogl` (FaultyTerminal vai embora)

## Limpeza (arquivos a deletar)

- `components/FaultyTerminal.tsx`
- `components/CnaeDesktop.tsx`
- `components/desktop.tsx`
- `components/desktop-icon.tsx`
- `components/window.tsx`
- `components/LoadingScreen.tsx` (será novo, Palantir-style)
- Janelas que viram páginas: `components/windows/*` (lógica migra para `pages/`)
- Janelas obsoletas se não referenciadas: `home-window.tsx`, `pricing-window.tsx`, `roadmap-window.tsx`, `terminal-window.tsx`, `update-window.tsx`, `documentation-window.tsx` (verificar uso antes)
- `WhatsAppModal.tsx` se não usado (verificar)
- `app/globals.css` keyframes do FaultyTerminal (`gtm-dash`, `gtm-blink`, `gtm-triangle`, `gtm-loading-text`)

## Preservar

- Toda lógica de negócio (Supabase auth, fetch CNAE, enriquecimento, intelligence, admin, perfil)
- Hooks (`useEnrichment`, `usePermissoes`)
- Tipos (`types/empresa.ts`)
- API routes (`app/api/*`)
- Estrutura Supabase

## Critérios de sucesso

1. Login renderiza com grid técnico, card Palantir-style, fluxo de auth funciona
2. AppShell carrega após login, sidebar e topbar renderizam
3. Cada página antiga tem equivalente funcional novo (navegação por sidebar)
4. Tabela de resultados densa, mono em CNPJ/datas, badge semântico em situação
5. Inspector rail aparece em Resultados e Intelligence; oculto nas demais
6. Mobile renderiza stack vertical de módulos com identidade Palantir
7. Cmd+K abre Terminal CNAE como overlay
8. Build passa (`pnpm build`), zero erros TypeScript
9. Sem inline styles novos (todos os arquivos novos em Tailwind)
10. Paleta amber removida; apenas dark Palantir presente

## Out of scope

- Mudanças funcionais (busca, fetch, validação) — preservar comportamento
- Adição de novas features (apenas reskin)
- Backend/Supabase changes
- I18n changes (PT-BR mantido)

## Riscos

- **Tamanho:** muitos arquivos. Mitigação: ordem incremental — tokens → primitivos → shell → login → páginas → mobile → cleanup → build
- **Regressão funcional:** lógica preservada literalmente; markup reescrito por cima
- **Rotas/imports:** AppShell substitui CnaeDesktop em `app/page.tsx` — refletir em todos os imports
