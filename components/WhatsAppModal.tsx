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
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEnviar() }}
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
