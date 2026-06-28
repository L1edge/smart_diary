import type { ReactNode } from 'react'

type NeonButtonProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function NeonButton({ children, onClick, disabled = false, type = 'button' }: NeonButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#8A2BE2]/20 bg-[#111] px-8 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:scale-[1.01] disabled:opacity-50"
    >
      <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-[#8A2BE2]/80 to-[#FF00FF]/80 opacity-80 transition-opacity group-hover:opacity-100"></div>
      <div className="absolute inset-0 h-full w-full glow-purple opacity-0 transition-opacity group-hover:opacity-100"></div>
      <span className="relative z-10">{children}</span>
    </button>
  )
}

export default NeonButton
