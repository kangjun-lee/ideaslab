export type PostLink = {
  url: string
  provider: 'youtube' | 'x' | 'soundcloud' | 'spotify' | 'link'
  embedUrl?: string
}

export const getPostLinks = (content: string): PostLink[] => {
  const links = new Set(
    content.match(/https?:\/\/[^\s<>"']+/g)?.map((url) => url.replace(/[),.;!?\]]+$/, '')),
  )

  return [...links].flatMap((url): PostLink[] => {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return []
    }

    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.split('/').filter(Boolean)
    const link = { url, provider: 'link' as const }

    if (
      ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(
        host,
      )
    ) {
      const videoId =
        host === 'youtu.be'
          ? path[0]
          : path[0] === 'watch'
          ? parsed.searchParams.get('v')
          : ['shorts', 'live', 'embed'].includes(path[0])
          ? path[1]
          : null
      if (videoId && /^[\w-]{11}$/.test(videoId)) {
        return [
          {
            url,
            provider: 'youtube',
            embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
          },
        ]
      }
      const playlistId = parsed.searchParams.get('list')
      if (path[0] === 'playlist' && playlistId && /^[\w-]+$/.test(playlistId)) {
        return [
          {
            url,
            provider: 'youtube',
            embedUrl: `https://www.youtube-nocookie.com/embed?listType=playlist&list=${playlistId}`,
          },
        ]
      }
    }

    if (
      ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'].includes(host)
    ) {
      const status = path.indexOf('status')
      if (status > 0 && /^\d+$/.test(path[status + 1] ?? '')) {
        return [{ url, provider: 'x', embedUrl: path[status + 1] }]
      }
    }

    if (['soundcloud.com', 'www.soundcloud.com', 'on.soundcloud.com'].includes(host)) {
      return [
        {
          url,
          provider: 'soundcloud',
          embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`,
        },
      ]
    }

    if (
      host === 'open.spotify.com' &&
      ['track', 'album', 'playlist', 'episode', 'show', 'artist'].includes(path[0]) &&
      /^[A-Za-z0-9]+$/.test(path[1] ?? '')
    ) {
      return [
        {
          url,
          provider: 'spotify',
          embedUrl: `https://open.spotify.com/embed/${path[0]}/${path[1]}`,
        },
      ]
    }

    return [link]
  })
}
