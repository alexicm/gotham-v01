# WhatsApp — Envio de Mensagem a partir de Resultados e Ficha

**Data:** 2026-04-15
**Status:** Aprovado

---

## Problema

Ao encontrar empresas na busca por CNAE, o usuário precisa entrar em contato via WhatsApp. O sistema já exibe o telefone, mas não há forma de iniciar uma conversa diretamente. A detecção automática de números WhatsApp não é viável sem API paga.

---

## Solução

Toggle manual por CNPJ: o usuário marca quais números são WhatsApp clicando em um ícone ao lado do telefone. Quando marcado, aparece um botão "Enviar mensagem" que abre um modal para digitar a mensagem antes de redirecionar para `wa.me`.

---

## Componentes

### `components/WhatsAppModal.tsx`

Componente isolado. Props:
- `telefone: string` — número bruto (ex: `(61) 99902-7080`)
- `nomeEmpresa: string` — exibido no topo para contexto
- `onClose: () => void`

Comportamento:
- Limpa o telefone: remove tudo que não é dígito, prefixa `55`
- Monta `https://wa.me/55{digitos}?text={encodeURIComponent(mensagem)}`
- Botão "Enviar" abre o link em nova aba e fecha o modal
- Botão "Cancelar" fecha o modal sem ação
- Textarea com placeholder "Digite sua mensagem..."
- Estilo consistente com o design system do projeto (tons bege/âmbar)

### `lib/whatsapp.ts`

Funções utilitárias:
- `formatWhatsAppNumber(telefone: string): string` — limpa e prefixa `55`
- `buildWhatsAppLink(telefone: string, mensagem: string): string` — monta a URL
- `getWhatsAppNumbers(): Record<string, boolean>` — lê `localStorage` (`wa_numbers`)
- `setWhatsAppNumber(cnpj: string, value: boolean): void` — persiste no `localStorage`

---

## Alterações nos componentes existentes

### `ResultadosWindow.tsx`

- Coluna "Telefone": exibe número + ícone WhatsApp (MessageCircle do lucide, cinza/verde)
- Clique no ícone alterna marcação no `localStorage` e atualiza estado local
- Quando marcado: botão "Enviar" aparece ao lado do ícone
- Clique no ícone e no botão usa `e.stopPropagation()` para não abrir a ficha

### `FichaWindow.tsx`

- Linha "Telefone" na seção Contato: mesmo padrão — ícone + botão quando marcado
- Lê estado inicial do `localStorage` ao montar

---

## Persistência

Chave `localStorage`: `wa_numbers`
Formato: `{ "12345678000195": true, "98765432000100": false }`

Sem sincronização entre dispositivos. Sem backend. Dados ficam no navegador do usuário.

---

## Formato do link

```
https://wa.me/55{digitos}?text={encodeURIComponent(mensagem)}
```

Exemplo com telefone `(61) 99902-7080` e mensagem `Olá, tudo bem?`:
```
https://wa.me/5561999027080?text=Ol%C3%A1%2C%20tudo%20bem%3F
```

---

## O que não está no escopo

- Detecção automática de números WhatsApp
- Persistência no Supabase
- Histórico de mensagens enviadas
- Templates de mensagem pré-definidos
