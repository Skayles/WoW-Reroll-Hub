import { qualityColor } from '@shared/constants'

export default function ItemIcon({
  url,
  quality
}: {
  url: string | null
  quality?: string
}): JSX.Element {
  const border = quality ? qualityColor(quality) : 'var(--border-strong)'

  if (!url) return <span className="item-icon empty" style={{ borderColor: border }} />

  return (
    <img
      className="item-icon"
      src={url}
      alt=""
      loading="lazy"
      style={{ borderColor: border }}
      onError={(e) => {
        e.currentTarget.classList.add('empty')
        e.currentTarget.removeAttribute('src')
      }}
    />
  )
}
