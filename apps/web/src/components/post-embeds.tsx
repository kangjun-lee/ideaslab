import { useRef } from 'react'
import Script from 'next/script'

import { getPostLinks } from '~/utils/post-links'

export const PostEmbeds = ({ content }: { content: string }) => {
  const links = getPostLinks(content)
  const container = useRef<HTMLDivElement>(null)

  if (links.length === 0) return null

  return (
    <section className="mt-6 space-y-5" aria-label="외부 콘텐츠" ref={container}>
      {links.map((link) => (
        <div
          key={link.url}
          className="min-w-0 rounded-[var(--radius-control)] border border-(color:--color-rule) bg-[var(--color-card)] p-3 sm:p-4"
        >
          {link.provider === 'youtube' && (
            <iframe
              title="YouTube 영상"
              src={link.embedUrl}
              className="aspect-video w-full rounded-[var(--radius-control)]"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}
          {link.provider === 'x' && (
            <blockquote className="twitter-tweet" data-dnt="true">
              <a href={link.url}>X 게시물 보기</a>
            </blockquote>
          )}
          {link.provider === 'soundcloud' && (
            <iframe
              title="SoundCloud 오디오"
              src={link.embedUrl}
              className="w-full rounded-[var(--radius-control)]"
              height="166"
              loading="lazy"
              allow="autoplay"
            />
          )}
          {link.provider === 'spotify' && (
            <iframe
              title="Spotify 콘텐츠"
              src={link.embedUrl}
              className="w-full rounded-[var(--radius-control)]"
              height="352"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block truncate text-sm text-(color:--color-accent) underline underline-offset-2"
          >
            {link.url}
          </a>
        </div>
      ))}
      {links.some((link) => link.provider === 'x') && (
        <Script
          src="https://platform.x.com/widgets.js"
          strategy="afterInteractive"
          onReady={() => {
            const x = window as typeof window & {
              twttr?: { widgets: { load: (element: HTMLElement | null) => void } }
            }
            x.twttr?.widgets.load(container.current)
          }}
        />
      )}
    </section>
  )
}
