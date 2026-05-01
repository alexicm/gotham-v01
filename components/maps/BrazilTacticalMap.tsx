'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { Crosshair, MapPin, Activity, Maximize2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  selected: string[]
  onToggleUF: (uf: string) => void
  onClear?: () => void
  height?: number
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const BRAZIL_BOUNDS = {
  north: 5.3,
  south: -33.8,
  east: -34.7,
  west: -73.99,
}

const BRAZIL_CENTER = { lat: -14.2, lng: -52.0 }

// Dark tactical map style — fundo bem escuro, sem POIs, fronteiras visíveis
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

export function BrazilTacticalMap({ selected, onToggleUF, onClear, height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const featuresRef = useRef<Map<string, google.maps.Data.Feature>>(new Map())
  const dataLayerRef = useRef<google.maps.Data | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hovered, setHovered] = useState<{ uf: string; nome: string } | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Init map
  useEffect(() => {
    if (!API_KEY) {
      setError('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ausente')
      return
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
          backgroundColor: '#080B12',
          gestureHandling: 'greedy',
          restriction: {
            latLngBounds: BRAZIL_BOUNDS,
            strictBounds: false,
          },
          styles: MAP_STYLE,
        })
        mapRef.current = map

        // Load GeoJSON
        const geo = await fetch('/br-states.json').then(r => r.json())
        const data = map.data
        dataLayerRef.current = data
        data.addGeoJson(geo)

        // Index features by UF
        data.forEach((f: google.maps.Data.Feature) => {
          const uf = f.getProperty('uf') as string
          if (uf) featuresRef.current.set(uf, f)
        })

        // Style: idle (não selecionado)
        data.setStyle((feature: google.maps.Data.Feature) => {
          const uf = feature.getProperty('uf') as string
          const isSelected = selected.includes(uf)
          return styleFor({ isSelected, isHovered: false })
        })

        // Hover: alterar estilo individual
        data.addListener('mouseover', (e: google.maps.Data.MouseEvent) => {
          const feature = e.feature
          const uf = feature.getProperty('uf') as string
          const nome = feature.getProperty('nome') as string
          setHovered({ uf, nome })
          data.overrideStyle(feature, styleFor({ isSelected: selected.includes(uf), isHovered: true }))
        })

        data.addListener('mouseout', (e: google.maps.Data.MouseEvent) => {
          data.revertStyle(e.feature)
          setHovered(null)
        })

        // Click: toggle UF
        data.addListener('click', (e: google.maps.Data.MouseEvent) => {
          const uf = e.feature.getProperty('uf') as string
          if (uf) onToggleUF(uf)
        })

        // Mouse move on map: update coords HUD
        map.addListener('mousemove', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return
          setCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() })
        })
        map.addListener('mouseout', () => setCoords(null))

        setReady(true)
      })
      .catch((err: unknown) => {
        console.error('[BrazilTacticalMap] loader error', err)
        setError('Falha ao carregar Google Maps')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-style when selection changes
  useEffect(() => {
    const data = dataLayerRef.current
    if (!data) return
    data.setStyle((feature: google.maps.Data.Feature) => {
      const uf = feature.getProperty('uf') as string
      return styleFor({
        isSelected: selected.includes(uf),
        isHovered: hovered?.uf === uf,
      })
    })
  }, [selected, hovered])

  const handleResetView = useCallback(() => {
    mapRef.current?.setCenter(BRAZIL_CENTER)
    mapRef.current?.setZoom(4)
  }, [])

  const handleFitSelected = useCallback(() => {
    const map = mapRef.current
    if (!map || selected.length === 0) {
      handleResetView()
      return
    }
    const bounds = new google.maps.LatLngBounds()
    selected.forEach(uf => {
      const feature = featuresRef.current.get(uf)
      if (!feature) return
      feature.getGeometry()?.forEachLatLng(ll => bounds.extend(ll))
    })
    map.fitBounds(bounds, 40)
  }, [selected, handleResetView])

  if (error) {
    return (
      <div
        className="rounded-[2px] border border-critical/40 bg-critical/10 p-4 text-[12px] text-critical font-mono"
        style={{ height }}
      >
        ! {error}
      </div>
    )
  }

  return (
    <div
      className="relative rounded-[2px] border border-border bg-background overflow-hidden"
      style={{ height }}
    >
      {/* The map */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 text-muted text-[11px] font-mono uppercase tracking-[0.18em] gap-2">
          <span className="size-3 rounded-full border-2 border-info/40 border-t-info animate-gtm-spin" />
          carregando malha tactical...
        </div>
      )}

      {/* Tactical overlays */}
      {ready && (
        <>
          {/* Bracket corners */}
          {([
            'top-2 left-2 border-t-2 border-l-2',
            'top-2 right-2 border-t-2 border-r-2',
            'bottom-2 left-2 border-b-2 border-l-2',
            'bottom-2 right-2 border-b-2 border-r-2',
          ] as const).map((cls, i) => (
            <span
              key={i}
              className={cn(
                'pointer-events-none absolute size-4 border-info/70 z-[5]',
                cls,
              )}
            />
          ))}

          {/* Crosshair quadrant lines */}
          <div className="pointer-events-none absolute inset-0 z-[4]">
            <span className="absolute top-1/2 left-0 right-0 h-px bg-info/15" />
            <span className="absolute top-0 bottom-0 left-1/2 w-px bg-info/15" />
            {/* Center reticle */}
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-4 border border-info/60 rounded-full" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1 bg-info/80 rounded-full" />
          </div>

          {/* Top HUD */}
          <div className="pointer-events-none absolute top-2 inset-x-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.18em] z-[6]">
            <div className="flex items-center gap-2 px-2 py-1 rounded-[2px] bg-background/70 border border-border/60 backdrop-blur-[1px]">
              <MapPin size={9} className="text-info" />
              <span className="text-muted">BRAZIL</span>
              <span className="text-info">TACTICAL OVERLAY</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 rounded-[2px] bg-background/70 border border-border/60 backdrop-blur-[1px]">
              <Activity size={9} className="text-success animate-gtm-pulse" />
              <span className="text-success">LIVE</span>
              <span className="text-muted/60">|</span>
              <span className="text-muted">UFs</span>
              <span className="text-primary tabular">
                {selected.length.toString().padStart(2, '0')}/27
              </span>
            </div>
          </div>

          {/* Bottom HUD */}
          <div className="pointer-events-none absolute bottom-2 inset-x-2 flex items-end justify-between text-[9px] font-mono uppercase tracking-[0.18em] z-[6]">
            <div className="flex items-center gap-2 px-2 py-1 rounded-[2px] bg-background/70 border border-border/60 backdrop-blur-[1px]">
              <Crosshair size={9} className="text-info" />
              <span className="text-muted">CURSOR</span>
              {coords ? (
                <span className="text-primary tabular">
                  {fmtCoord(coords.lat, 'N', 'S')} · {fmtCoord(coords.lng, 'E', 'W')}
                </span>
              ) : (
                <span className="text-muted/40">—</span>
              )}
            </div>

            {hovered && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-[2px] bg-info/15 border border-info/40 backdrop-blur-[1px]">
                <span className="text-info font-bold">{hovered.uf}</span>
                <span className="text-muted/60">|</span>
                <span className="text-primary normal-case tracking-normal">{hovered.nome}</span>
                <span className="text-muted/60">·</span>
                <span className="text-info">
                  {selected.includes(hovered.uf) ? '— click p/ remover' : '— click p/ selecionar'}
                </span>
              </div>
            )}

            <div className="pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleFitSelected}
                disabled={selected.length === 0}
                title="Enquadrar seleção"
                className={cn(
                  'h-7 px-2 rounded-[2px] border text-[9px] font-semibold tracking-[0.1em] flex items-center gap-1 transition-colors',
                  selected.length === 0
                    ? 'border-border/50 bg-surface/40 text-muted/40 cursor-not-allowed'
                    : 'border-info/40 bg-info/10 text-info hover:bg-info/20',
                )}
              >
                <Maximize2 size={9} />
                FIT
              </button>
              <button
                type="button"
                onClick={handleResetView}
                title="Reset view"
                className="h-7 px-2 rounded-[2px] border border-border bg-surface/70 text-muted hover:text-primary hover:border-border-strong text-[9px] font-semibold tracking-[0.1em] flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={9} />
                RESET
              </button>
              {onClear && selected.length > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  title="Limpar seleção"
                  className="h-7 px-2 rounded-[2px] border border-critical/40 bg-critical/10 text-critical hover:bg-critical/20 text-[9px] font-semibold tracking-[0.1em] transition-colors"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          {/* Watermark scan label (vertical, decorative) */}
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 z-[6] text-[8px] font-mono uppercase tracking-[0.4em] text-info/30 [writing-mode:vertical-rl] rotate-180">
            ◢ TACTICAL ◢ INTEL ◢ GRID
          </div>
        </>
      )}
    </div>
  )
}

function styleFor({
  isSelected,
  isHovered,
}: {
  isSelected: boolean
  isHovered: boolean
}): google.maps.Data.StyleOptions {
  // Cores tactical: idle muted, hover info, selected success
  if (isSelected && isHovered) {
    return {
      fillColor: '#3DDB7E',
      fillOpacity: 0.45,
      strokeColor: '#3DDB7E',
      strokeOpacity: 1,
      strokeWeight: 2,
      cursor: 'pointer',
    }
  }
  if (isSelected) {
    return {
      fillColor: '#3DDB7E',
      fillOpacity: 0.32,
      strokeColor: '#3DDB7E',
      strokeOpacity: 0.95,
      strokeWeight: 1.5,
      cursor: 'pointer',
    }
  }
  if (isHovered) {
    return {
      fillColor: '#4FA8FF',
      fillOpacity: 0.28,
      strokeColor: '#4FA8FF',
      strokeOpacity: 0.95,
      strokeWeight: 1.5,
      cursor: 'pointer',
    }
  }
  return {
    fillColor: '#1A2230',
    fillOpacity: 0.5,
    strokeColor: '#3D4A66',
    strokeOpacity: 0.85,
    strokeWeight: 1,
    cursor: 'pointer',
  }
}

function fmtCoord(value: number, pos: string, neg: string): string {
  const abs = Math.abs(value)
  const deg = Math.floor(abs)
  const min = Math.floor((abs - deg) * 60)
  const sec = Math.floor(((abs - deg) * 60 - min) * 60)
  return `${deg.toString().padStart(2, '0')}°${min.toString().padStart(2, '0')}'${sec.toString().padStart(2, '0')}"${value >= 0 ? pos : neg}`
}
