const Header = ({ telegramId }: { telegramId: number }) => {
  return (
    <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-white/10 px-4 py-3">
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Telegram Mini BI</h1>
        <span className="text-xs text-muted">user: {telegramId || 'unknown'}</span>
      </div>
    </header>
  )
}

export default Header
