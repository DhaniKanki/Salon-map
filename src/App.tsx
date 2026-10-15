import { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { salons, type Salon } from './data/salons'

const CATEGORY_COLORS: Record<string, string> = {
  Salon: '#667eea',
  'Nail Studio': '#f59e0b',
  'Tattoo Studio': '#ef4444',
}

interface RouteResult {
  distanceKm: number
  durationMin: number
  coords: [number, number][]
}

function getCategoryColor(category: string): string {
  const key = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
  return CATEGORY_COLORS[key] || '#667eea'
}

function createCustomIcon(color: string, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin ${selected ? 'selected' : ''}" style="background: ${color};">
        <span class="marker-inner">💈</span>
      </div>
    `,
    iconSize: selected ? [38, 38] : [30, 30],
    iconAnchor: selected ? [19, 38] : [15, 30],
    popupAnchor: [0, -30],
  })
}

function FitBounds({ selected, routeCoords }: { selected: Salon[]; routeCoords: [number, number][] }) {
  const map = useMap()
  if (routeCoords.length > 1) {
    const bounds = L.latLngBounds(routeCoords)
    map.fitBounds(bounds, { padding: [80, 80] })
  } else if (selected.length === 2) {
    const bounds = L.latLngBounds(selected.map((s) => [s.lat, s.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [80, 80] })
  }
  return null
}

export default function App() {
  const [selected, setSelected] = useState<Salon[]>([])
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const center: [number, number] = [23.05, 72.55]

  useEffect(() => {
    let cancelled = false
    if (selected.length !== 2) {
      setRoute(null)
      setError(null)
      setLoading(false)
      return
    }
    const [a, b] = selected
    setLoading(true)
    setError(null)
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const r = data.routes[0]
          const coords: [number, number][] = r.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          )
          setRoute({
            distanceKm: r.distance / 1000,
            durationMin: r.duration / 60,
            coords,
          })
        } else {
          setError('Could not find a route between these locations.')
        }
      })
      .catch(() => {
        if (cancelled) return
        setError('Network error fetching route. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected])

  const handleMarkerClick = (salon: Salon) => {
    setSelected((prev) => {
      if (prev.find((s) => s.id === salon.id)) {
        return prev.filter((s) => s.id !== salon.id)
      }
      if (prev.length >= 2) {
        return [prev[1], salon]
      }
      return [...prev, salon]
    })
  }

  const handleReset = () => setSelected([])

  const categories = useMemo(() => {
    const set = new Set(salons.map((s) => s.category))
    return Array.from(set)
  }, [])

  return (
    <div className="app">
      <div className="header">
        <h1>Salon Locator Map</h1>
        <p>Click on any two salon markers to see the real driving distance & route</p>
      </div>

      <div className="map-container">
        <MapContainer center={center} zoom={12} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {salons.map((salon) => {
            const isSelected = !!selected.find((s) => s.id === salon.id)
            return (
              <Marker
                key={salon.id}
                position={[salon.lat, salon.lng]}
                icon={createCustomIcon(getCategoryColor(salon.category), isSelected)}
                eventHandlers={{ click: () => handleMarkerClick(salon) }}
              >
                <Popup>
                  <div className="salon-popup">
                    <div className="popup-name">{salon.name}</div>
                    <div className="popup-row">
                      <strong>Category:</strong> {salon.category}
                    </div>
                    {salon.area && (
                      <div className="popup-row">
                        <strong>Area:</strong> {salon.area}
                      </div>
                    )}
                    {salon.address && (
                      <div className="popup-row">
                        <strong>Address:</strong> {salon.address}
                      </div>
                    )}
                    {salon.link && (
                      <a
                        className="popup-link"
                        href={salon.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in Google Maps ↗
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {route && (
            <Polyline
              positions={route.coords}
              pathOptions={{ color: '#667eea', weight: 5, opacity: 0.85 }}
            />
          )}

          <FitBounds selected={selected} routeCoords={route?.coords || []} />
        </MapContainer>

        <div className="info-panel">
          <h3>Navigation Distance</h3>
          {loading && (
            <p style={{ fontSize: '0.85rem', color: '#666' }}>Calculating route…</p>
          )}
          {!loading && error && (
            <div>
              <p style={{ fontSize: '0.85rem', color: '#d33' }}>{error}</p>
              <button className="reset-btn" onClick={handleReset}>
                Reset Selection
              </button>
            </div>
          )}
          {!loading && !error && route && selected.length === 2 && (
            <>
              <div className="distance-display">
                <div className="distance-value">{route.distanceKm.toFixed(2)} km</div>
                <div className="distance-label">
                  {selected[0].name} → {selected[1].name}
                </div>
              </div>
              <div className="duration-display">
                <span className="duration-icon">🚗</span>
                <span>
                  Est. travel time: <strong>{Math.round(route.durationMin)} min</strong>
                </span>
              </div>
              <div className="selected-salons">
                <span className="selected-chip">1. {selected[0].name}</span>
                <span className="selected-chip">2. {selected[1].name}</span>
              </div>
              <button className="reset-btn" onClick={handleReset}>
                Reset Selection
              </button>
            </>
          )}
          {!loading && !error && !route && (
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              {selected.length === 0
                ? 'Click on a salon marker to start.'
                : `Selected: ${selected[0].name}. Click another salon to calculate distance.`}
            </p>
          )}
          {selected.length === 1 && (
            <button className="reset-btn" onClick={handleReset} style={{ marginTop: '10px' }}>
              Cancel Selection
            </button>
          )}
        </div>

        <div className="legend">
          <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>
            Categories
          </div>
          {categories.map((cat) => (
            <div className="legend-item" key={cat}>
              <span className="legend-color" style={{ background: getCategoryColor(cat) }}></span>
              <span>{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
