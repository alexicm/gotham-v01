export function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#d4c4a8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Geist Mono', monospace",
      zIndex: 99999,
    }}>
      <style>{`
        .gtm-triangle {
          stroke: #d97706;
          stroke-dasharray: 17;
          animation: gtm-dash 2.5s cubic-bezier(0.35, 0.04, 0.63, 0.95) infinite;
        }
        @keyframes gtm-dash {
          to { stroke-dashoffset: 136; }
        }
        .gtm-loading-text {
          font-family: 'Geist Mono', monospace;
          font-size: 5px;
          animation: gtm-blink 0.9s ease-in-out infinite;
          fill: #2c2416;
        }
        @keyframes gtm-blink {
          50% { opacity: 0; }
        }
      `}</style>

      <svg width="200" height="200" viewBox="0 0 40 60">
        <polygon
          className="gtm-triangle"
          fill="none"
          strokeWidth="1"
          points="16,1 32,32 1,32"
        />
        <text className="gtm-loading-text" x="0" y="45">
          Carregando...
        </text>
      </svg>

      <span style={{ fontSize: 10, color: '#8a7a5a', marginTop: -32, letterSpacing: '0.1em' }}>
        GOTHAM v0.1
      </span>
    </div>
  )
}
