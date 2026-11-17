const base = (active) => ({
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: active ? "#2563EB" : "#9CA3AF",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
})

export function IconHome({ active }) {
  return (
    <svg {...base(active)}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.5Z" fill={active ? "#EFF6FF" : "none"} />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  )
}

/** Lotes: um frasco/barril simples */
export function IconBatches({ active }) {
  return (
    <svg {...base(active)}>
      <rect x="5" y="4" width="14" height="16" rx="3" fill={active ? "#EFF6FF" : "none"} />
      <path d="M5 9h14M5 15h14" />
    </svg>
  )
}

export function IconChart({ active }) {
  return (
    <svg {...base(active)}>
      <path d="M4 4v16h16" />
      <path d="m7 15 4-5 3 3 5-6" />
    </svg>
  )
}

export function IconSettings({ active }) {
  return (
    <svg {...base(active)}>
      <path d="M5 7h9M18 7h1M5 17h1M10 17h9" />
      <circle cx="16" cy="7" r="2" fill={active ? "#EFF6FF" : "none"} />
      <circle cx="8" cy="17" r="2" fill={active ? "#EFF6FF" : "none"} />
    </svg>
  )
}

export function IconLog({ active }) {
  return (
    <svg {...base(active)}>
      <rect x="5" y="4" width="14" height="16" rx="2.5" fill={active ? "#EFF6FF" : "none"} />
      <path d="M9 9h6M9 12.5h6M9 16h3" />
    </svg>
  )
}
