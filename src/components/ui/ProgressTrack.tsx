type ProgressTrackProps = {
  label: string
  percentage: number
}

export function ProgressTrack({ label, percentage }: ProgressTrackProps) {
  const safePercentage = Math.min(Math.max(percentage, 0), 100)

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="mb-2 flex justify-between text-xs uppercase tracking-[0.2em] text-gray-400">
        <span>{label}</span>
        <span className="font-mono text-[#FF00FF]">{safePercentage}%</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-linear-to-r from-[#8A2BE2] to-[#FF00FF] transition-all duration-500 ease-out glow-pink"
          style={{ width: `${safePercentage}%` }}
        ></div>
      </div>
    </div>
  )
}

export default ProgressTrack
