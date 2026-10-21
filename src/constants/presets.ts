export interface MediaPreset {
  label: string
  url: string
  type: 'image' | 'video'
}

export const SAMPLE_IMAGE_PRESETS: MediaPreset[] = [
  {
    label: 'Sunset Beach',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    type: 'image',
  },
  {
    label: 'Alpine Peaks',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    type: 'image',
  },
  {
    label: 'Modern Skyline',
    url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80',
    type: 'image',
  },
  {
    label: 'Coffee Vibes',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
    type: 'image',
  },
  {
    label: 'Neon Nights',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80',
    type: 'image',
  },
]

export const SAMPLE_STORY_PRESETS: MediaPreset[] = [
  {
    label: 'Golden Hour (Photo)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=720&auto=format&fit=crop&q=80',
    type: 'image',
  },
  {
    label: 'Urban Rooftop (Photo)',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=720&auto=format&fit=crop&q=80',
    type: 'image',
  },
  {
    label: 'Mountain Vista (Photo)',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=720&auto=format&fit=crop&q=80',
    type: 'image',
  },
  {
    label: 'Ocean Breeze (Photo)',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=720&auto=format&fit=crop&q=80',
    type: 'image',
  },
  {
    label: 'Spring Blossom (Clip)',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    type: 'video',
  },
  {
    label: 'Ocean Waves (Clip)',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    type: 'video',
  },
]

export const SAMPLE_REEL_PRESETS: Array<{ label: string; url: string; caption: string; audioTitle: string }> = [
  {
    label: 'Ocean Waves Motion',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    caption: 'Deep blue horizons and coastal vibes 🌊',
    audioTitle: 'Ocean Breeze — Ambient Chill',
  },
  {
    label: 'Botanical Bloom',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    caption: 'Spring has arrived in full bloom 🌸✨',
    audioTitle: 'Spring Reverie — Lo-Fi Beats',
  },
  {
    label: 'Wildlife Wonder',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    caption: 'Sunny afternoons in the meadow 🐰☀️',
    audioTitle: 'Meadow Melody — Acoustic Acoustic',
  },
  {
    label: 'Cinematic Journey',
    url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    caption: 'A tale of courage and high adventure ⚔️🎬',
    audioTitle: 'Epic Odyssey — Symphony Orchestra',
  },
]
