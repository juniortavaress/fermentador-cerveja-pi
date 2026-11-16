const stroke = (active) => (active ? "#2563EB" : "#9CA3AF")
const fill = (active) => (active ? "#EFF6FF" : "none")

export function IconHome({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" stroke={stroke(active)} strokeWidth="1.5" fill={fill(active)} />
      <path d="M8 20v-7h6v7" stroke={stroke(active)} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function IconTemp({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 13.5V5" stroke={stroke(active)} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="16" r="3" stroke={stroke(active)} strokeWidth="1.5" fill={fill(active)} />
      <path d="M14 6h-2M14 8.5h-2M14 11h-2" stroke={stroke(active)} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconLog({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="16" height="16" rx="2.5" stroke={stroke(active)} strokeWidth="1.5" fill={fill(active)} />
      <path d="M7 8h8M7 11h8M7 14h5" stroke={stroke(active)} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconSchedule({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="5" width="16" height="14" rx="2.5" stroke={stroke(active)} strokeWidth="1.5" fill={fill(active)} />
      <path d="M7 3v4M15 3v4M3 9h16" stroke={stroke(active)} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconSettings({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="3" stroke={stroke(active)} strokeWidth="1.5" fill={fill(active)} />
      <path
        d="M11 3v2M11 17v2M3 11h2M17 11h2M5.6 5.6l1.4 1.4M15 15l1.4 1.4M5.6 16.4l1.4-1.4M15 7l1.4-1.4"
        stroke={stroke(active)}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
