const InsightFeed = ({ insights }: { insights: string[] }) => {
  if (!insights.length) return null
  return (
    <section className="grid gap-3">
      {insights.map((item, idx) => (
        <article key={`${item}-${idx}`} className="rounded-xl border border-white/10 bg-card/70 p-4">
          <p className="text-sm">{item}</p>
        </article>
      ))}
    </section>
  )
}

export default InsightFeed
