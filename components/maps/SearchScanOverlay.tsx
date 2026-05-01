'use client'

import { useEffect, useRef, useState } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import {
  Crosshair,
  Radar,
  Activity,
  Target,
  Database,
  Wifi,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  ufs: string[] // sigla de cada estado a varrer; vazio = Brasil inteiro
  cnaes: string[]
  durationMs?: number
  onComplete: () => void
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const BRAZIL_CENTER = { lat: -14.2, lng: -52.0 }
const BRAZIL_BOUNDS = {
  north: 5.3,
  south: -33.8,
  east: -34.7,
  west: -73.99,
}

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0F1827' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#566A8C' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#080B12' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#3D4A66' }, { weight: 1.2 }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#2D3850' }, { weight: 0.8 }] },
  { featureType: 'administrative.locality', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#11192A' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070C16' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3D4A66' }] },
]

interface Pulse {
  uf: string
  nome: string
  // Pixel position in container, calculated each frame from map projection
  lat: number
  lng: number
  startMs: number
}

interface ScanLogLine {
  type: 'info' | 'success' | 'warning' | 'violet'
  text: string
}

export function SearchScanOverlay({
  ufs,
  cnaes,
  durationMs = 5000,
  onComplete,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [tick, setTick] = useState(0)
  const [pulses, setPulses] = useState<Pulse[]>([])
  const [logLines, setLogLines] = useState<ScanLogLine[]>([])
  const [progress, setProgress] = useState(0)
  const [scanlineY, setScanlineY] = useState(0)
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 })
  const startTsRef = useRef(performance.now())

  // 1) Setup map + load GeoJSON + fit bounds
  useEffect(() => {
    if (!API_KEY) {
      // Sem mapa, ainda assim respeitar duração
      const t = setTimeout(onComplete, durationMs)
      return () => clearTimeout(t)
    }
    if (!containerRef.current) return

    let cancelled = false
    setOptions({ key: API_KEY, v: 'weekly' })

    importLibrary('maps')
      .then(async (Maps) => {
        if (cancelled || !containerRef.current) return
        const map = new (Maps as typeof google.maps).Map(containerRef.current, {
          center: BRAZIL_CENTER,
          zoom: 4,
          minZoom: 3,
          maxZoom: 7,
          disableDefaultUI: true,
          gestureHandling: 'none',
          keyboardShortcuts: false,
          backgroundColor: '#080B12',
          styles: MAP_STYLE,
          restriction: { latLngBounds: BRAZIL_BOUNDS, strictBounds: false },
        })
        mapRef.current = map

        const geo = await fetch('/br-states.json').then(r => r.json())
        const data = map.data
        data.addGeoJson(geo)

        const targets = ufs.length > 0 ? ufs : null

        // Style: idle muted, target highlighted
        data.setStyle((feature: google.maps.Data.Feature) => {
          const uf = feature.getProperty('uf') as string
          const isTarget = !targets || targets.includes(uf)
          return {
            fillColor: isTarget ? '#3DDB7E' : '#1A2230',
            fillOpacity: isTarget ? 0.18 : 0.4,
            strokeColor: isTarget ? '#3DDB7E' : '#3D4A66',
            strokeOpacity: isTarget ? 0.9 : 0.6,
            strokeWeight: isTarget ? 1.4 : 0.8,
          }
        })

        // Compute bounds and pulse centers
        const bounds = new google.maps.LatLngBounds()
        const pulseList: Pulse[] = []
        const targetSet = targets ? new Set(targets) : null

        data.forEach((f: google.maps.Data.Feature) => {
          const uf = f.getProperty('uf') as string
          const nome = f.getProperty('nome') as string
          const include = !targetSet || targetSet.has(uf)
          if (!include) return

          // Compute centroid by sampling all latLngs
          let sumLat = 0
          let sumLng = 0
          let count = 0
          let localBounds = new google.maps.LatLngBounds()
          f.getGeometry()?.forEachLatLng(ll => {
            sumLat += ll.lat()
            sumLng += ll.lng()
            count++
            bounds.extend(ll)
            localBounds.extend(ll)
          })
          if (count === 0) return
          // Use bounds center for better visual placement than mean
          const c = localBounds.getCenter()
          pulseList.push({
            uf,
            nome,
            lat: c.lat(),
            lng: c.lng(),
            startMs: 0, // assigned below
          })
        })

        // Stagger pulse start times across the duration
        const totalPulses = pulseList.length
        const window = Math.max(durationMs - 700, 1500) // leave time for last pulse to bloom
        pulseList.sort((a, b) => a.lng - b.lng) // varrer da esquerda para direita
        pulseList.forEach((p, i) => {
          p.startMs = totalPulses === 1 ? 0 : (i / (totalPulses - 1)) * window
        })
        setPulses(pulseList)

        // Fit map to selection
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 24)
        }

        setMapReady(true)
      })
      .catch(() => {
        // Falha do Google Maps: respeitar duração
        const t = setTimeout(onComplete, durationMs)
        return () => clearTimeout(t)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2) Animation tick + completion timer
  useEffect(() => {
    let raf = 0
    function frame(now: number) {
      const elapsed = now - startTsRef.current
      const p = Math.min(elapsed / durationMs, 1)
      setProgress(p)
      setTick(t => t + 1)
      // scanline rolando de cima para baixo, ciclo 1.4s
      const cyclePos = ((elapsed % 1400) / 1400)
      setScanlineY(cyclePos)

      if (p < 1) raf = requestAnimationFrame(frame)
      else onComplete()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 3) Resize observer for overlay (need width/height for projection math)
  useEffect(() => {
    if (!overlayRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setOverlaySize({ width: e.contentRect.width, height: e.contentRect.height })
      }
    })
    ro.observe(overlayRef.current)
    return () => ro.disconnect()
  }, [])

  // 4) Log lines: appear over time
  useEffect(() => {
    if (!mapReady) return
    const messages: { at: number; line: ScanLogLine }[] = [
      { at: 100,  line: { type: 'info',    text: '[ 00:00.10 ] establishing tactical uplink...' } },
      { at: 350,  line: { type: 'success', text: '[ 00:00.35 ] geo-fence engaged · ' + (ufs.length > 0 ? ufs.join(' · ') : 'BR full coverage') } },
      { at: 750,  line: { type: 'info',    text: '[ 00:00.75 ] cnae filter loaded · ' + cnaes.slice(0, 3).join(' / ') + (cnaes.length > 3 ? ' (+' + (cnaes.length - 3) + ')' : '') } },
      { at: 1200, line: { type: 'warning', text: '[ 00:01.20 ] sweeping target zones...' } },
      { at: 2100, line: { type: 'violet',  text: '[ 00:02.10 ] cross-referencing brasilapi...' } },
      { at: 3000, line: { type: 'info',    text: '[ 00:03.00 ] running fuzzy match...' } },
      { at: 3900, line: { type: 'success', text: '[ 00:03.90 ] aggregating results...' } },
      { at: 4600, line: { type: 'success', text: '[ 00:04.60 ] payload ready · standby for handoff' } },
    ]
    const elapsed = performance.now() - startTsRef.current
    const timers: number[] = []
    messages.forEach(m => {
      const wait = Math.max(0, m.at - elapsed)
      timers.push(window.setTimeout(() => {
        setLogLines(prev => [...prev, m.line])
      }, wait))
    })
    return () => { timers.forEach(t => clearTimeout(t)) }
  }, [mapReady, ufs, cnaes])

  // Compute pulse pixel positions each frame (depends on tick)
  const pulsePixels = (() => {
    const map = mapRef.current
    if (!map || !mapReady) return [] as { p: Pulse; x: number; y: number; localElapsed: number }[]
    const proj = map.getProjection()
    if (!proj) return []
    const bounds = map.getBounds()
    if (!bounds) return []

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    const tl = proj.fromLatLngToPoint(new google.maps.LatLng(ne.lat(), sw.lng()))!
    const br = proj.fromLatLngToPoint(new google.maps.LatLng(sw.lat(), ne.lng()))!

    const elapsed = performance.now() - startTsRef.current

    return pulses.map(pl => {
      const pt = proj.fromLatLngToPoint(new google.maps.LatLng(pl.lat, pl.lng))!
      const x = ((pt.x - tl.x) / (br.x - tl.x)) * overlaySize.width
      const y = ((pt.y - tl.y) / (br.y - tl.y)) * overlaySize.height
      return { p: pl, x, y, localElapsed: elapsed - pl.startMs }
    })
  })()

  return (
    <div className="fixed inset-0 z-[9998] bg-background flex items-center justify-center p-4 sm:p-8 animate-gtm-fade-in select-none">
      {/* Background grid + ambient */}
      <div className="absolute inset-0 bg-grid-tech opacity-60 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      {/* Main container — map + overlays */}
      <div className="relative w-full h-full max-w-[1280px] max-h-[820px] rounded-[2px] border border-border bg-background overflow-hidden flex flex-col">
        {/* Top HUD */}
        <div className="h-9 border-b border-border bg-surface/90 backdrop-blur-sm flex items-center px-3 flex-shrink-0 z-30 relative">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em]">
            <Radar size={12} className="text-warning animate-gtm-pulse" />
            <span className="text-warning">SCANNING</span>
            <span className="text-muted/60">|</span>
            <span className="text-muted">CNAE</span>
            <span className="text-info">{cnaes.length}</span>
            <span className="text-muted/60">·</span>
            <span className="text-muted">UF</span>
            <span className="text-success">{ufs.length === 0 ? 'ALL' : ufs.length}</span>
            <span className="text-muted/60">·</span>
            <span className="text-muted">PULSES</span>
            <span className="text-violet">{pulses.length.toString().padStart(2, '0')}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em]">
            <span className="flex items-center gap-1.5">
              <Activity size={10} className="text-success animate-gtm-pulse" />
              <span className="text-success">LIVE</span>
            </span>
            <span className="text-muted/60">|</span>
            <span className="text-muted">ETA</span>
            <span className="text-primary tabular">
              {((1 - progress) * (durationMs / 1000)).toFixed(1)}s
            </span>
            <span className="text-muted/60">|</span>
            <span className="text-info tabular font-semibold">
              {Math.round(progress * 100).toString().padStart(3, '0')}%
            </span>
          </div>
        </div>

        {/* Map container with overlays */}
        <div className="relative flex-1 min-h-0">
          <div ref={containerRef} className="absolute inset-0" />

          {/* Pulse + scanline overlay */}
          <div
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none z-20"
          >
            {/* Quadrant grid */}
            <span className="absolute top-1/2 left-0 right-0 h-px bg-info/15" />
            <span className="absolute top-0 bottom-0 left-1/2 w-px bg-info/15" />

            {/* Bracket corners */}
            {([
              'top-2 left-2 border-t-2 border-l-2',
              'top-2 right-2 border-t-2 border-r-2',
              'bottom-2 left-2 border-b-2 border-l-2',
              'bottom-2 right-2 border-b-2 border-r-2',
            ] as const).map((cls, i) => (
              <span key={i} className={cn('absolute size-5 border-info/70', cls)} />
            ))}

            {/* Vertical scanline rolling top→bottom */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${scanlineY * 100}%`,
                height: '4px',
                background:
                  'linear-gradient(180deg, transparent 0%, rgba(61,219,126,0.85) 50%, transparent 100%)',
                boxShadow: '0 0 18px 2px rgba(61,219,126,0.55)',
              }}
            />
            {/* Trail above scanline */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: 0,
                height: `${scanlineY * 100}%`,
                background:
                  'linear-gradient(180deg, transparent 0%, rgba(61,219,126,0.04) 80%, rgba(61,219,126,0.10) 100%)',
              }}
            />

            {/* Center reticle */}
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-5 border border-info/50 rounded-full" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1 bg-info rounded-full" />

            {/* Pulses on each target UF */}
            {pulsePixels.map(({ p, x, y, localElapsed }) => {
              if (localElapsed < 0) return null
              // Multiple ring pulses every ~700ms
              const period = 800
              const cycles = Math.floor(localElapsed / period) + 1
              return (
                <div
                  key={p.uf}
                  className="absolute"
                  style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
                >
                  {/* Static target marker */}
                  <span className="absolute -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-success border border-success-foreground"
                        style={{ boxShadow: '0 0 12px rgba(61,219,126,0.85)' }} />
                  <span className="absolute -translate-x-1/2 -translate-y-1/2 size-4 rounded-full border border-success/70" />

                  {/* Concentric rings — render last 3 pulses */}
                  {Array.from({ length: Math.min(3, cycles) }).map((_, i) => {
                    const ringElapsed = localElapsed - i * period
                    const t = (ringElapsed % period) / period
                    const radius = 6 + t * 38
                    const opacity = (1 - t) * 0.85
                    return (
                      <span
                        key={i}
                        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                        style={{
                          width: radius * 2,
                          height: radius * 2,
                          border: '1.5px solid rgba(61,219,126,1)',
                          opacity,
                        }}
                      />
                    )
                  })}

                  {/* UF label */}
                  <span
                    className="absolute -translate-x-1/2 text-[9px] font-mono font-bold tracking-[0.1em] text-success whitespace-nowrap"
                    style={{
                      top: 14,
                      textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,1)',
                    }}
                  >
                    {p.uf}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Side log panel */}
          <div className="absolute top-3 left-3 w-[300px] max-w-[40%] bg-surface/85 border border-border backdrop-blur-sm rounded-[2px] z-30 hidden md:block">
            <div className="h-7 border-b border-border flex items-center justify-between px-2.5 text-[9px] uppercase tracking-[0.18em]">
              <span className="flex items-center gap-1.5 text-success">
                <Database size={9} />
                SCAN LOG
              </span>
              <span className="text-muted/70 tabular">
                {logLines.length.toString().padStart(2, '0')}/{[100,350,750,1200,2100,3000,3900,4600].length.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="p-2 space-y-0.5 font-mono text-[10px] tabular max-h-[180px] overflow-hidden">
              {logLines.map((l, i) => (
                <div
                  key={i}
                  className={cn(
                    'truncate animate-gtm-fade-in',
                    {
                      info: 'text-info',
                      success: 'text-success',
                      warning: 'text-warning',
                      violet: 'text-violet',
                    }[l.type],
                  )}
                >
                  {l.text}
                </div>
              ))}
              {logLines.length > 0 && (
                <div className="text-muted/60 animate-gtm-pulse">▊</div>
              )}
            </div>
          </div>

          {/* Right HUD card */}
          <div className="absolute top-3 right-3 w-[220px] bg-surface/85 border border-border backdrop-blur-sm rounded-[2px] z-30 hidden md:block">
            <div className="h-7 border-b border-border flex items-center px-2.5 text-[9px] uppercase tracking-[0.18em] gap-1.5">
              <Target size={9} className="text-warning" />
              <span className="text-warning">TARGETS</span>
            </div>
            <div className="p-2 grid grid-cols-3 gap-1 max-h-[260px] overflow-y-auto">
              {(ufs.length > 0 ? ufs : ['BR']).map((u, i) => {
                const cyc = Math.floor(tick / 6 + i) % 3
                return (
                  <span
                    key={u}
                    className={cn(
                      'h-6 rounded-[2px] border text-center text-[10px] font-mono tabular flex items-center justify-center transition-colors',
                      cyc === 0
                        ? 'border-success bg-success/20 text-success'
                        : 'border-success/40 bg-success/8 text-success/70',
                    )}
                  >
                    {u}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Loading state if map not ready yet */}
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-40">
              <div className="flex items-center gap-2 text-muted text-[11px] font-mono uppercase tracking-[0.18em]">
                <span className="size-3 rounded-full border-2 border-info/40 border-t-info animate-gtm-spin" />
                preparando varredura...
              </div>
            </div>
          )}
        </div>

        {/* Bottom progress bar */}
        <div className="border-t border-border bg-surface/90 backdrop-blur-sm flex-shrink-0 z-30 relative">
          <div className="h-0.5 bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-info via-violet to-success transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="px-3 h-9 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.18em]">
            <div className="flex items-center gap-3 text-muted">
              <span className="flex items-center gap-1.5">
                <Wifi size={9} className="text-info" />
                <span className="text-muted">UPLINK</span>
                <span className="text-info">SECURE</span>
              </span>
              <span className="text-muted/40">|</span>
              <span>
                <Crosshair size={9} className="inline text-success mr-1" />
                <span className="text-success">SCAN</span>
                <span className="text-muted ml-1">{(progress * (durationMs / 1000)).toFixed(2)}s / {(durationMs / 1000).toFixed(2)}s</span>
              </span>
            </div>
            <div className="text-muted">
              <span className="text-muted/60">handoff:</span>
              <span className="ml-2 text-warning">RESULTADOS</span>
              <span className="text-muted/60 ml-1">▸</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
