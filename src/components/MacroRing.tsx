interface MacroRingProps {
  label: string
  current: number
  target: number
  color: string
  unit?: string
  size?: number
}

export function MacroRing({ label, current, target, color, unit = 'g', size = 80 }: MacroRingProps) {
  const pct = target > 0 ? Math.min(current / target, 1) : 0
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const center = size / 2

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={center} cy={center} r={r} fill="none" stroke="#1f2937" strokeWidth={8} />
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeDasharray={circ}
            strokeDashoffset={circ - dash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-white leading-none">
            {Math.round(current)}
          </span>
          <span className="text-[9px] text-gray-500">{unit}</span>
        </div>
      </div>
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      <span className="text-[10px] text-gray-600">/ {Math.round(target)}{unit}</span>
    </div>
  )
}

interface MacroBarProps {
  label: string
  current: number
  target: number
  color: string
  unit?: string
}

export function MacroBar({ label, current, target, color, unit = 'g' }: MacroBarProps) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const over = current > target

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 font-medium">{label}</span>
        <span className={over ? 'text-red-400' : 'text-gray-300'}>
          {Math.round(current)}{unit} <span className="text-gray-600">/ {Math.round(target)}{unit}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : color }}
        />
      </div>
    </div>
  )
}
