const Header = ({ telegramId }: { telegramId: number }) => {
  return (
    <header className="sticky top-0 z-10 bg-slate-950/60 backdrop-blur-xl border-b border-cyan-200/10 px-4 py-3">
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-cyan-100">Telegram Mini BI</h1>
        <span className="text-xs text-cyan-100/70">user: {telegramId || 'unknown'}</span>
      </div>
    </header>
  )
}

export default Header
