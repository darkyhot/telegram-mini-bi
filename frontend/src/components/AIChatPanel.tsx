import { useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  text: string
}

const AIChatPanel = ({
  onAsk,
  messages,
}: {
  onAsk: (question: string) => Promise<void>
  messages: Message[]
}) => {
  const [input, setInput] = useState('Where is revenue declining?')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!input.trim()) return
    setLoading(true)
    try {
      await onAsk(input.trim())
      setInput('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-wide">AI Analysis</h3>
        <span className="text-xs text-cyan-200/70">chat-first mode</span>
      </div>
      <div className="max-h-72 overflow-auto space-y-2 pr-1">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`text-sm rounded-xl px-3 py-2 border ${m.role === 'assistant' ? 'bg-white/5 border-white/10' : 'bg-cyan-400/20 border-cyan-300/30'}`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="field-input flex-1"
          placeholder="Ask: Where did revenue drop last month?"
        />
        <button onClick={() => void submit()} disabled={loading} className="btn-neon whitespace-nowrap">
          {loading ? 'Thinking...' : 'Ask AI'}
        </button>
      </div>
    </section>
  )
}

export default AIChatPanel
