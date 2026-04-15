# WhatsApp — Envio de Mensagem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o usuário marque telefones como WhatsApp e envie mensagens personalizadas diretamente dos resultados de busca e da ficha da empresa.

**Architecture:** Utilitários puros em `lib/whatsapp.ts` (sem side effects), modal isolado em `components/WhatsAppModal.tsx`, e integração nos dois componentes existentes (`ResultadosWindow` e `FichaWindow`). Persistência via `localStorage` com chave `wa_numbers`.

**Tech Stack:** React (useState, useEffect), lucide-react (MessageCircle), localStorage, URL wa.me

---

### Task 1: Criar `lib/whatsapp.ts`

**Files:**
- Create: `lib/whatsapp.ts`

- [ ] **Step 1: Criar o arquivo com as 4 funções utilitárias**

```typescript
// lib/whatsapp.ts

const LS_KEY = 'wa_numbers'

/** Remove tudo que não é dígito e garante prefixo 55 */
export function formatWhatsAppNumber(telefone: string): string {
  const digits = telefone.replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

/** Monta a URL wa.me com a mensagem encodada */
export function buildWhatsAppLink(telefone: string, mensagem: string): string {
  const number = formatWhatsAppNumber(telefone)
  return `https://wa.me/${number}?text=${encodeURIComponent(mensagem)}`
}

/** Lê todos os CNPJs marcados como WhatsApp do localStorage */
export function getWhatsAppNumbers(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** Persiste (ou remove) marcação de um CNPJ no localStorage */
export function setWhatsAppNumber(cnpj: string, value: boolean): void {
  if (typeof window === 'undefined') return
  const current = getWhatsAppNumbers()
  if (value) {
    current[cnpj] = true
  } else {
    delete current[cnpj]
  }
  localStorage.setItem(LS_KEY, JSON.stringify(current))
}
```

- [ ] **Step 2: Verificar tipos com TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "whatsapp"
```

Esperado: sem output (sem erros).

- [ ] **Step 3: Commit**

```bash
git add lib/whatsapp.ts
git commit -m "feat: add whatsapp utility functions"
```

---

### Task 2: Criar `components/WhatsAppModal.tsx`

**Files:**
- Create: `components/WhatsAppModal.tsx`

- [ ] **Step 1: Criar o componente modal**

```tsx
// components/WhatsAppModal.tsx
'use client'

import { useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { buildWhatsAppLink } from '@/lib/whatsapp'

interface Props {
  telefone: string
  nomeEmpresa: string
  onClose: () => void
}

export function WhatsAppModal({ telefone, nomeEmpresa, onClose }: Props) {
  const [mensagem, setMensagem] = useState('')

  function handleEnviar() {
    if (!mensagem.trim()) return
    const link = buildWhatsAppLink(telefone, mensagem.trim())
    window.open(link, '_blank', 'noopener,noreferrer')
    onClose()
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#f5f1e8',
          border: '1px solid #c8b888',
          borderRadius: 14,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid #ddd0b0',
            background: '#ede8da',
          }}
        >
          <MessageCircle size={16} color="#25d366" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2c2416' }}>
              Enviar mensagem WhatsApp
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#7a6a4a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nomeEmpresa} · {telefone}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#7a6a4a',
              padding: 4,
              display: 'flex',
            }}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            autoFocus
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            placeholder="Digite sua mensagem..."
            rows={5}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#fdf9f0',
              border: '1px solid #c8b888',
              borderRadius: 8,
              fontSize: 13,
              color: '#2c2416',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px',
                background: '#ede8da',
                border: '1px solid #c8b888',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                color: '#7a6a4a',
                fontFamily: 'inherit',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleEnviar}
              disabled={!mensagem.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                background: mensagem.trim() ? '#25d366' : '#c8b888',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: mensagem.trim() ? 'pointer' : 'not-allowed',
                color: mensagem.trim() ? '#fff' : '#f5f1e8',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              <Send size={13} />
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos com TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "WhatsApp"
```

Esperado: sem output.

- [ ] **Step 3: Commit**

```bash
git add components/WhatsAppModal.tsx
git commit -m "feat: add WhatsAppModal component"
```

---

### Task 3: Integrar em `components/windows/FichaWindow.tsx`

**Files:**
- Modify: `components/windows/FichaWindow.tsx`

- [ ] **Step 1: Adicionar imports**

No topo do arquivo, adicionar após os imports existentes:

```tsx
import { MessageCircle } from 'lucide-react'
import { WhatsAppModal } from '@/components/WhatsAppModal'
import { getWhatsAppNumbers, setWhatsAppNumber } from '@/lib/whatsapp'
```

- [ ] **Step 2: Adicionar estado no componente `FichaWindow`**

Dentro da função `FichaWindow`, após `const [error, setError] = useState('')`:

```tsx
const [isWa, setIsWa] = useState<boolean>(() => {
  const digits = cnpj.replace(/\D/g, '')
  return getWhatsAppNumbers()[digits] ?? false
})
const [showWaModal, setShowWaModal] = useState(false)
```

- [ ] **Step 3: Substituir a linha de Telefone na seção Contato**

Localizar:
```tsx
<InfoRow label="Telefone" value={empresa.telefone} />
```

Substituir por:
```tsx
<InfoRow
  label="Telefone"
  value={
    empresa.telefone ? (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <span style={{ fontFamily: 'monospace' }}>{empresa.telefone}</span>
        <button
          onClick={() => {
            const digits = cnpj.replace(/\D/g, '')
            const next = !isWa
            setIsWa(next)
            setWhatsAppNumber(digits, next)
          }}
          title={isWa ? 'Remover marcação WhatsApp' : 'Marcar como WhatsApp'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            color: isWa ? '#25d366' : '#c8b888',
            transition: 'color 0.15s',
          }}
        >
          <MessageCircle size={15} />
        </button>
        {isWa && (
          <button
            onClick={() => setShowWaModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              background: '#25d366',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              color: '#fff',
              fontFamily: 'inherit',
            }}
          >
            <MessageCircle size={11} /> Enviar mensagem
          </button>
        )}
      </span>
    ) : undefined
  }
/>
```

- [ ] **Step 4: Adicionar modal ao final do JSX retornado**

Dentro do `return`, antes do último `</div>` de fechamento do componente inteiro, adicionar:

```tsx
{showWaModal && empresa?.telefone && (
  <WhatsAppModal
    telefone={empresa.telefone}
    nomeEmpresa={empresa.nomeFantasia || empresa.razaoSocial}
    onClose={() => setShowWaModal(false)}
  />
)}
```

- [ ] **Step 5: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "FichaWindow"
```

Esperado: sem output.

- [ ] **Step 6: Commit**

```bash
git add components/windows/FichaWindow.tsx
git commit -m "feat: add WhatsApp toggle and modal to FichaWindow"
```

---

### Task 4: Integrar em `components/windows/ResultadosWindow.tsx`

**Files:**
- Modify: `components/windows/ResultadosWindow.tsx`

- [ ] **Step 1: Adicionar imports**

No topo do arquivo, adicionar após os imports existentes:

```tsx
import { MessageCircle } from 'lucide-react'
import { WhatsAppModal } from '@/components/WhatsAppModal'
import { getWhatsAppNumbers, setWhatsAppNumber } from '@/lib/whatsapp'
```

- [ ] **Step 2: Adicionar estado no componente `ResultadosWindow`**

Dentro da função `ResultadosWindow`, após `const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')`:

```tsx
const [waNumbers, setWaNumbers] = useState<Record<string, boolean>>(() => getWhatsAppNumbers())
const [waModal, setWaModal] = useState<{ telefone: string; nomeEmpresa: string } | null>(null)

function toggleWa(cnpj: string, e: React.MouseEvent) {
  e.stopPropagation()
  const next = !waNumbers[cnpj]
  setWhatsAppNumber(cnpj, next)
  setWaNumbers(prev => ({ ...prev, [cnpj]: next }))
}
```

- [ ] **Step 3: Substituir a célula de Telefone na tabela**

Localizar:
```tsx
<td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
  {empresa.telefone ?? <span style={{ color: '#c8b888' }}>—</span>}
</td>
```

Substituir por:
```tsx
<td
  style={{ ...tdStyle, fontSize: 11, whiteSpace: 'nowrap' }}
  onClick={e => e.stopPropagation()}
>
  {empresa.telefone ? (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: 'monospace' }}>{empresa.telefone}</span>
      <button
        onClick={e => toggleWa(empresa.cnpj, e)}
        title={waNumbers[empresa.cnpj] ? 'Remover marcação WhatsApp' : 'Marcar como WhatsApp'}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          color: waNumbers[empresa.cnpj] ? '#25d366' : '#c8b888',
          transition: 'color 0.15s',
        }}
      >
        <MessageCircle size={13} />
      </button>
      {waNumbers[empresa.cnpj] && (
        <button
          onClick={e => { e.stopPropagation(); setWaModal({ telefone: empresa.telefone!, nomeEmpresa: empresa.nomeFantasia || empresa.razaoSocial }) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 8px',
            background: '#25d366',
            border: 'none',
            borderRadius: 5,
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            color: '#fff',
            fontFamily: 'inherit',
          }}
        >
          <MessageCircle size={10} /> Enviar
        </button>
      )}
    </span>
  ) : (
    <span style={{ color: '#c8b888' }}>—</span>
  )}
</td>
```

- [ ] **Step 4: Adicionar modal ao final do JSX retornado**

Dentro do `return`, antes do último `</div>` de fechamento:

```tsx
{waModal && (
  <WhatsAppModal
    telefone={waModal.telefone}
    nomeEmpresa={waModal.nomeEmpresa}
    onClose={() => setWaModal(null)}
  />
)}
```

- [ ] **Step 5: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Esperado: apenas os 3 erros pré-existentes em `app/page.tsx`, nenhum novo.

- [ ] **Step 6: Commit final**

```bash
git add components/windows/ResultadosWindow.tsx
git commit -m "feat: add WhatsApp toggle and modal to ResultadosWindow"
```
