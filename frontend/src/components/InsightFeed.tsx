const InsightFeed = ({ insights }: { insights: string[] }) => {
  if (!insights.length) return null
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {insights.map((item, idx) => (
        <article key={`${item}-${idx}`} className="panel p-4">
          <p className="text-sm text-cyan-50">{item}</p>
        </article>
      ))}
    </section>
  )
}

export default InsightFeed
