export const MODULOS = ['busca', 'terminal', 'cnpj', 'admin'] as const
export type Modulo = typeof MODULOS[number]

// Módulos padrão por nível
export const MODULOS_PADRAO: Record<'admin' | 'agente', Modulo[]> = {
  admin: ['busca', 'terminal', 'cnpj', 'admin'],
  agente: ['busca', 'cnpj'],
}

// Labels para exibição
export const MODULO_LABELS: Record<Modulo, string> = {
  busca: 'Busca CNAE',
  terminal: 'Terminal',
  cnpj: 'CNPJ Lookup',
  admin: 'Painel Admin',
}
