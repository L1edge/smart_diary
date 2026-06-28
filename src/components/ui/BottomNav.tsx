export function BottomNav() {
  return (
    <div className="fixed bottom-6 left-1/2 w-[90%] max-w-sm -translate-x-1/2">
      <div className="glass-panel flex items-center justify-between rounded-full px-6 py-3">
        <button className="p-3 text-gray-400 transition-colors hover:text-white" aria-label="Overview">
          <div className="h-6 w-6 rounded-md bg-white/10"></div>
        </button>

        <button className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full border-4 border-[#050507] bg-fuchsia-500 text-2xl text-white glow-pink">
          +
        </button>

        <button className="p-3 text-gray-400 transition-colors hover:text-white" aria-label="Insights">
          <div className="h-6 w-6 rounded-md bg-white/10"></div>
        </button>
      </div>
    </div>
  )
}

export default BottomNav
