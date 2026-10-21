import React, { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  X,
  MapPin,
  Search,
  Navigation,
  Check,
  Loader2,
  ZoomIn,
  ZoomOut,
  Coffee,
  Landmark,
  Compass,
  ShoppingBag,
} from 'lucide-react'
import {
  mapService,
  type AccuratePlaceDetails,
} from '../../services/mapService'

export interface SelectedLocation {
  name: string
  lat?: number
  lng?: number
  city?: string
  country?: string
}

interface MapLocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectLocation: (location: SelectedLocation) => void
  initialLocation?: string
  initialLat?: number
  initialLng?: number
}

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialLocation = '',
  initialLat,
  initialLng,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AccuratePlaceDetails[]>([])
  const [searching, setSearching] = useState(false)
  const [locatingUser, setLocatingUser] = useState(false)
  const [activeCategory, setActiveCategory] = useState<'all' | 'food' | 'landmark' | 'beach' | 'mall'>('all')

  // Coordinates: default to initial or Chennai Central
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat ?? 13.0827,
    lng: initialLng ?? 80.2707,
  })
  const [zoom, setZoom] = useState(16)
  const [selectedPlaceTitle, setSelectedPlaceTitle] = useState(
    initialLocation ? initialLocation.split(',')[0].trim() : 'Chennai Central'
  )
  const [selectedPlaceSubtitle, setSelectedPlaceSubtitle] = useState(
    initialLocation && initialLocation.includes(',')
      ? initialLocation.split(',').slice(1).join(',').trim()
      : 'Tamil Nadu, India'
  )

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Popular curated places
  const CURATED_PLACES: AccuratePlaceDetails[] = [
    {
      title: 'Marina Beach',
      subtitle: 'Triplicane, Chennai',
      full: 'Marina Beach, Triplicane, Chennai',
      lat: 13.0500,
      lng: 80.2824,
      type: 'beach',
    },
    {
      title: 'Besant Nagar Beach (Bessie)',
      subtitle: 'Besant Nagar, Chennai',
      full: 'Besant Nagar Beach (Bessie), Besant Nagar, Chennai',
      lat: 12.9996,
      lng: 80.2707,
      type: 'beach',
    },
    {
      title: 'Express Avenue Mall',
      subtitle: 'Royapettah, Chennai',
      full: 'Express Avenue Mall, Royapettah, Chennai',
      lat: 13.0588,
      lng: 80.2642,
      type: 'mall',
    },
    {
      title: 'Phoenix Marketcity',
      subtitle: 'Velachery, Chennai',
      full: 'Phoenix Marketcity, Velachery, Chennai',
      lat: 12.9915,
      lng: 80.2173,
      type: 'mall',
    },
    {
      title: 'Kapaleeshwarar Temple',
      subtitle: 'Mylapore, Chennai',
      full: 'Kapaleeshwarar Temple, Mylapore, Chennai',
      lat: 13.0335,
      lng: 80.2699,
      type: 'landmark',
    },
    {
      title: 'San Thome Basilica',
      subtitle: 'Santhome, Chennai',
      full: 'San Thome Basilica, Santhome, Chennai',
      lat: 13.0337,
      lng: 80.2778,
      type: 'landmark',
    },
    {
      title: 'Saravana Bhavan',
      subtitle: 'T. Nagar, Chennai',
      full: 'Saravana Bhavan, T. Nagar, Chennai',
      lat: 13.0418,
      lng: 80.2341,
      type: 'food',
    },
    {
      title: 'Blue Tokai Coffee Roasters',
      subtitle: 'Nungambakkam, Chennai',
      full: 'Blue Tokai Coffee Roasters, Nungambakkam, Chennai',
      lat: 13.0604,
      lng: 80.2405,
      type: 'food',
    },
  ]

  // Initialize REAL Interactive Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return

    // Avoid multiple instances
    if (leafletMapRef.current) {
      leafletMapRef.current.remove()
      leafletMapRef.current = null
    }

    const map = L.map(mapContainerRef.current, {
      center: [currentCoords.lat, currentCoords.lng],
      zoom: zoom,
      zoomControl: false, // We render custom Instagram-style zoom buttons
    })

    // OpenStreetMap Real Tile Layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    // Instagram Gradient Marker Icon
    const customPinIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #f09433, #dc2743);
          transform: rotate(-45deg);
          border: 2px solid #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #fff;"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    })

    const marker = L.marker([currentCoords.lat, currentCoords.lng], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map)

    // Handle marker drag
    marker.on('dragend', async () => {
      const pos = marker.getLatLng()
      setCurrentCoords({ lat: pos.lat, lng: pos.lng })
      const res = await mapService.reverseGeocode(pos.lat, pos.lng)
      if (res) {
        setSelectedPlaceTitle(res.title)
        setSelectedPlaceSubtitle(res.subtitle)
      }
    })

    // Handle click anywhere on the real map
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      marker.setLatLng([lat, lng])
      setCurrentCoords({ lat, lng })
      map.panTo([lat, lng])
      const res = await mapService.reverseGeocode(lat, lng)
      if (res) {
        setSelectedPlaceTitle(res.title)
        setSelectedPlaceSubtitle(res.subtitle)
      }
    })

    map.on('zoomend', () => {
      setZoom(map.getZoom())
    })

    leafletMapRef.current = map
    markerRef.current = marker

    // Force map to recalculate container size
    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      map.remove()
      leafletMapRef.current = null
      markerRef.current = null
    }
  }, [isOpen])

  // Move marker & map center when currentCoords changes programmatically
  const moveToLocation = (lat: number, lng: number, title?: string, subtitle?: string, targetZoom = 17) => {
    setCurrentCoords({ lat, lng })
    if (title) setSelectedPlaceTitle(title)
    if (subtitle) setSelectedPlaceSubtitle(subtitle)

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([lat, lng], targetZoom, { duration: 0.8 })
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    }
  }

  // Live Street & Place Search via Photon + Nominatim with location bias
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const results = await mapService.searchPlacesAndStreets(
          q,
          currentCoords.lat,
          currentCoords.lng,
          10
        )
        setSearchResults(results)
      } catch (err) {
        console.warn('Search error:', err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, currentCoords.lat, currentCoords.lng])

  // Accurate GPS button using HTML5 geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setLocatingUser(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const res = await mapService.reverseGeocode(lat, lng)
        moveToLocation(
          lat,
          lng,
          res?.title || 'Your Current Location',
          res?.subtitle || '',
          17
        )
        setLocatingUser(false)
      },
      (err) => {
        console.warn('Geolocation error:', err)
        setLocatingUser(false)
        alert('Could not retrieve current location. Please grant location permissions.')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const handleSelectSearchResult = (result: AccuratePlaceDetails) => {
    moveToLocation(result.lat, result.lng, result.title, result.subtitle, 17)
    setSearchResults([])
    setSearchQuery('')
  }

  const handleSelectCuratedPlace = (place: AccuratePlaceDetails) => {
    moveToLocation(place.lat, place.lng, place.title, place.subtitle, 16)
  }

  const handleZoomIn = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut()
    }
  }

  const handleConfirm = () => {
    const full = selectedPlaceSubtitle
      ? `${selectedPlaceTitle}, ${selectedPlaceSubtitle}`
      : selectedPlaceTitle

    onSelectLocation({
      name: full,
      lat: currentCoords.lat,
      lng: currentCoords.lng,
      city: selectedPlaceSubtitle.split(',')[0]?.trim(),
    })
    onClose()
  }

  if (!isOpen) return null

  const filteredCurated = CURATED_PLACES.filter((p) => {
    if (activeCategory === 'all') return true
    return p.type === activeCategory
  })

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(5px)',
      }}
    >
      <div
        className="map-location-picker-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg, 20px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(220, 39, 67, 0.3)',
              }}
            >
              <MapPin size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Real Interactive Map & Streets
              </h3>
              <p style={{ fontSize: '11px', margin: 0, color: 'var(--text-muted)' }}>
                Search any real street, road, cafe, landmark worldwide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & GPS Action Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '8px',
          }}
        >
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search exact street (e.g. Anna Salai, Ranganathan St, Wall St)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '9px 36px 9px 36px',
                borderRadius: 'var(--radius-md, 10px)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            {searching && (
              <Loader2
                size={15}
                className="rotating"
                style={{ position: 'absolute', right: '12px', color: 'var(--color-pink)' }}
              />
            )}
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locatingUser}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: 'var(--radius-md, 10px)',
              background: 'rgba(225, 48, 108, 0.12)',
              border: '1px solid rgba(225, 48, 108, 0.3)',
              color: 'var(--color-pink, #e1306c)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title="Use high accuracy GPS location"
          >
            <Navigation size={14} className={locatingUser ? 'rotating' : ''} />
            <span>{locatingUser ? 'Locating...' : 'GPS'}</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div
          style={{
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-secondary)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '999px',
              border: activeCategory === 'all' ? '1px solid var(--color-pink)' : '1px solid var(--border-subtle)',
              background: activeCategory === 'all' ? 'rgba(225, 48, 108, 0.15)' : 'var(--bg-elevated)',
              color: activeCategory === 'all' ? 'var(--color-pink)' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Compass size={12} />
            <span>All Places & Streets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('food')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '999px',
              border: activeCategory === 'food' ? '1px solid var(--color-pink)' : '1px solid var(--border-subtle)',
              background: activeCategory === 'food' ? 'rgba(225, 48, 108, 0.15)' : 'var(--bg-elevated)',
              color: activeCategory === 'food' ? 'var(--color-pink)' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Coffee size={12} />
            <span>Cafes & Food ☕</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('beach')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '999px',
              border: activeCategory === 'beach' ? '1px solid var(--color-pink)' : '1px solid var(--border-subtle)',
              background: activeCategory === 'beach' ? 'rgba(225, 48, 108, 0.15)' : 'var(--bg-elevated)',
              color: activeCategory === 'beach' ? 'var(--color-pink)' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🏖️ Beaches & Parks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('landmark')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '999px',
              border: activeCategory === 'landmark' ? '1px solid var(--color-pink)' : '1px solid var(--border-subtle)',
              background: activeCategory === 'landmark' ? 'rgba(225, 48, 108, 0.15)' : 'var(--bg-elevated)',
              color: activeCategory === 'landmark' ? 'var(--color-pink)' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Landmark size={12} />
            <span>Landmarks 🏛️</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('mall')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '999px',
              border: activeCategory === 'mall' ? '1px solid var(--color-pink)' : '1px solid var(--border-subtle)',
              background: activeCategory === 'mall' ? 'rgba(225, 48, 108, 0.15)' : 'var(--bg-elevated)',
              color: activeCategory === 'mall' ? 'var(--color-pink)' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <ShoppingBag size={12} />
            <span>Malls & Shopping 🛍️</span>
          </button>
        </div>

        {/* Live Search Autocomplete Dropdown with Real Streets */}
        {searchResults.length > 0 && (
          <div
            style={{
              maxHeight: '190px',
              overflowY: 'auto',
              background: 'var(--bg-elevated)',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '4px 0',
              zIndex: 30,
            }}
          >
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSearchResult(result)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 20px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(225, 48, 108, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-pink, #e1306c)',
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {result.title}
                  </div>
                  {result.subtitle && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '1px',
                      }}
                    >
                      {result.subtitle}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Curated Accurate Quick Places Pills */}
        <div
          style={{
            padding: '7px 20px',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>
            POPULAR:
          </span>
          {filteredCurated.map((place) => (
            <button
              key={place.full}
              type="button"
              onClick={() => handleSelectCuratedPlace(place)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '999px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {place.title}
            </button>
          ))}
        </div>

        {/* Real Interactive Leaflet OpenStreetMap Viewport */}
        <div style={{ position: 'relative', width: '100%', height: '260px', backgroundColor: '#e5e7eb' }}>
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '100%',
              zIndex: 1,
            }}
          />

          {/* Map Controls: Custom Zoom In / Out & Tap Hint */}
          <div
            style={{
              position: 'absolute',
              right: '12px',
              bottom: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              zIndex: 400, // Above leaflet tiles
            }}
          >
            <button
              type="button"
              onClick={handleZoomIn}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
          </div>

          {/* Interactive instruction badge */}
          <div
            style={{
              position: 'absolute',
              left: '12px',
              bottom: '12px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 600,
              pointerEvents: 'none',
              backdropFilter: 'blur(4px)',
              zIndex: 400,
            }}
          >
            🖐 Drag map or tap to drop pin
          </div>
        </div>

        {/* Selected Location Pill & Confirm Button */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'var(--bg-elevated)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md, 12px)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(225, 48, 108, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-pink, #e1306c)',
                flexShrink: 0,
              }}
            >
              <MapPin size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Selected Street / Place:
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedPlaceTitle}
              </div>
              {selectedPlaceSubtitle && (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedPlaceSubtitle}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  fontFamily: 'monospace',
                }}
              >
                {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-pink)', fontWeight: 600 }}>
                Zoom {zoom}x
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedPlaceTitle.trim()}
            className="btn-primary"
            style={{
              justifyContent: 'center',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 700,
              opacity: selectedPlaceTitle.trim() ? 1 : 0.5,
            }}
          >
            <Check size={16} />
            <span>Apply Location ({selectedPlaceTitle})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
