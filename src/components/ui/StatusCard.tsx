import type { ReactNode } from 'react'

type StatusCardProps = {
  title: string
  value: string
  icon: ReactNode
}

export function StatusCard({ title, value, icon }: StatusCardProps) {
  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl p-5 transition-colors duration-300 hover:border-white/20">
      <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[#8A2BE2]/10 blur-3xl"></div>

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <div className="mt-3 text-3xl font-light tracking-[0.25em] text-white text-glow-purple">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg opacity-80">
          {icon}
        </div>
      </div>
    </div>
  )
}

export default StatusCard
