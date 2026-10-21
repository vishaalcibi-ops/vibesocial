export interface AccuratePlaceDetails {
  title: string
  subtitle: string
  full: string
  lat: number
  lng: number
  type?: string
}

export function formatAccuratePlace(data: any): AccuratePlaceDetails {
  if (!data) {
    return {
      title: 'Unknown Place',
      subtitle: '',
      full: '',
      lat: 0,
      lng: 0,
    }
  }

  const addr = data.address || {}
  const primaryVenue =
    data.name ||
    addr.amenity ||
    addr.tourism ||
    addr.shop ||
    addr.leisure ||
    addr.historic ||
    addr.building ||
    null

  const neighborhood =
    addr.suburb ||
    addr.neighbourhood ||
    addr.quarter ||
    addr.residential ||
    addr.city_district ||
    addr.road ||
    null

  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    null

  const state = addr.state || null
  const country = addr.country || null

  let title = ''
  let subtitleParts: string[] = []

  if (primaryVenue) {
    title = primaryVenue
    if (neighborhood && neighborhood.toLowerCase() !== primaryVenue.toLowerCase()) {
      subtitleParts.push(neighborhood)
    }
    if (
      city &&
      city.toLowerCase() !== primaryVenue.toLowerCase() &&
      (!neighborhood || city.toLowerCase() !== neighborhood.toLowerCase())
    ) {
      subtitleParts.push(city)
    }
    if (!city && state) subtitleParts.push(state)
  } else if (neighborhood) {
    title = neighborhood
    if (city && city.toLowerCase() !== neighborhood.toLowerCase()) subtitleParts.push(city)
    if (state && state.toLowerCase() !== (city || '').toLowerCase()) subtitleParts.push(state)
  } else if (city) {
    title = city
    if (state && state.toLowerCase() !== city.toLowerCase()) subtitleParts.push(state)
    if (country) subtitleParts.push(country)
  } else {
    const rawParts = (data.display_name || '').split(', ')
    title = rawParts[0] || 'Selected Location'
    subtitleParts = rawParts.slice(1, 3)
  }

  const subtitle = subtitleParts.filter(Boolean).join(', ')
  const full = subtitle ? `${title}, ${subtitle}` : title

  return {
    title,
    subtitle,
    full,
    lat: parseFloat(data.lat || data.latitude || '0'),
    lng: parseFloat(data.lon || data.longitude || '0'),
    type: data.type || data.category || 'place',
  }
}

export function formatPhotonFeature(feature: any): AccuratePlaceDetails {
  const p = feature.properties || {}
  const coords = feature.geometry?.coordinates || [0, 0]
  const lng = Number(coords[0]) || 0
  const lat = Number(coords[1]) || 0

  const title = p.name || p.street || 'Selected Place'
  const subParts: string[] = []

  if (p.housenumber && p.street && p.name !== `${p.housenumber} ${p.street}`) {
    subParts.push(`#${p.housenumber}`)
  }
  if (p.locality && p.locality.toLowerCase() !== title.toLowerCase()) {
    subParts.push(p.locality)
  }
  if (p.district && p.district.toLowerCase() !== title.toLowerCase() && !subParts.includes(p.district)) {
    subParts.push(p.district)
  }
  if (p.city && p.city.toLowerCase() !== title.toLowerCase()) {
    subParts.push(p.city)
  }
  if (p.state && !subParts.includes(p.state) && (!p.city || p.city.toLowerCase() !== p.state.toLowerCase())) {
    subParts.push(p.state)
  }

  const subtitle = subParts.filter(Boolean).join(', ')
  const full = subtitle ? `${title}, ${subtitle}` : title

  return {
    title,
    subtitle,
    full,
    lat,
    lng,
    type: p.osm_key || p.type || 'street',
  }
}

export const mapService = {
  async searchPlacesAndStreets(
    query: string,
    currentLat = 13.0827,
    currentLng = 80.2707,
    limit = 10
  ): Promise<AccuratePlaceDetails[]> {
    const q = query.trim()
    if (!q) return []

    // 1. Try Komoot Photon API (has full global street-level OSM database, no rate limit, CORS open, location bias)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        q
      )}&lat=${currentLat}&lon=${currentLng}&limit=${limit}`

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(photonUrl, { signal: controller.signal })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        if (data && Array.isArray(data.features) && data.features.length > 0) {
          const results = data.features.map(formatPhotonFeature)
          return results
        }
      }
    } catch (err) {
      console.warn('Photon geocoding fallback to Nominatim:', err)
    }

    // 2. Fallback to OpenStreetMap Nominatim
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        q
      )}&limit=${limit}&addressdetails=1&extratags=1`

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(nomUrl, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          return data.map(formatAccuratePlace)
        }
      }
    } catch (err) {
      console.warn('Nominatim geocoding error:', err)
    }

    return []
  },

  async reverseGeocode(lat: number, lng: number): Promise<AccuratePlaceDetails | null> {
    // 1. Try Photon reverse geocoding
    try {
      const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3500)
      const res = await fetch(photonUrl, { signal: controller.signal })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        if (data && Array.isArray(data.features) && data.features.length > 0) {
          return formatPhotonFeature(data.features[0])
        }
      }
    } catch (e) {
      console.warn('Photon reverse error, fallback to OSM:', e)
    }

    // 2. Fallback to Nominatim reverse
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1&extratags=1`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3500)
      const res = await fetch(nomUrl, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        if (data) {
          return formatAccuratePlace(data)
        }
      }
    } catch (e) {
      console.warn('Nominatim reverse error:', e)
    }

    return null
  },
}
