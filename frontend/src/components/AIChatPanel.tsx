import { useState } from 'react'

import { askAi } from '../services/api'
import { useAppStore } from '../store/useAppStore'

const AIChatPanel = () => {
  const { dataset, telegramId, messages, pushMessage, setCandidateChart } = useAppStore()
  const [input, setInput] = useState('Where is revenue declining?')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!dataset || !input.trim()) return
    pushMessage({ role: 'user', text: input })
    setLoading(true)
    try {
      const result = await askAi(dataset.id, telegramId, input)
      pushMessage({ role: 'assistant', text: result.answer })
      setCandidateChart(result)
      setInput('')
    } catch (e) {
      pushMessage({ role: 'assistant', text: e instanceof Error ? e.message : 'AI error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-card/70 p-4 flex flex-col gap-3">
      <h3 className="text-sm font-medium">AI Analysis</h3>
      <div className="max-h-64 overflow-auto space-y-2">
        {messages.map((m, idx) => (
          <div key={idx} className={`text-sm rounded-md px-3 py-2 ${m.role === 'assistant' ? 'bg-white/5' : 'bg-accent/20'}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-md bg-slate-900 border border-white/10 px-3 py-2 text-sm"
          placeholder="Ask a question"
        />
        <button onClick={() => void submit()} disabled={loading} className="rounded-md bg-accent px-3 py-2 text-sm text-slate-950 font-semibold">
          {loading ? '...' : 'Ask'}
        </button>
      </div>
    </section>
  )
}

export default AIChatPanel
