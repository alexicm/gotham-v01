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
