import { useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'

import type { AIQueryResponse } from '../types/dataset'

type Props = {
  data: AIQueryResponse
  fill?: boolean
  onExplain?: () => Promise<string>
}

const ChartCard = ({ data, fill = false, onExplain }: Props) => {
  const { chart_config: cfg, chart_data } = data
  const chartRef = useRef<ReactECharts | null>(null)
  const [status, setStatus] = useState('')
  const [explanation, setExplanation] = useState('')

  const isComparison = chart_data.length > 0 && Object.prototype.hasOwnProperty.call(chart_data[0], 'current')

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: cfg.type === 'pie' ? 'item' : 'axis' },
    grid: cfg.type === 'pie' ? undefined : { top: 20, right: 12, bottom: 28, left: 42 },
    xAxis: cfg.type === 'pie' ? undefined : { type: 'category', data: chart_data.map((d) => d.x) },
    yAxis: cfg.type === 'pie' ? undefined : { type: 'value' },
    series: isComparison
      ? [
          {
            name: 'Текущий период',
            type: 'line',
            data: chart_data.map((d) => d.current ?? null),
            smooth: true,
          },
          {
            name: 'Предыдущий период',
            type: 'line',
            data: chart_data.map((d) => d.previous ?? null),
            smooth: true,
            lineStyle: { type: 'dashed' },
          },
        ]
      : cfg.type === 'pie'
        ? [{ type: 'pie', radius: '65%', data: chart_data.map((d) => ({ name: d.x, value: d.y })) }]
        : [{ type: cfg.type === 'histogram' ? 'bar' : cfg.type, data: chart_data.map((d) => d.y), smooth: true }],
    textStyle: { color: '#e5e7eb' },
  }

  const copyAsPng = async () => {
    try {
      const inst = chartRef.current?.getEchartsInstance()
      if (!inst) return
      const dataUrl = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#0b1220' })

      const res = await fetch(dataUrl)
      const blob = await res.blob()

      type ClipboardItemCtor = new (items: Record<string, Blob>) => unknown
      const itemCtor = (window as Window & { ClipboardItem?: ClipboardItemCtor }).ClipboardItem

      if (navigator.clipboard && 'write' in navigator.clipboard && itemCtor) {
        const item = new itemCtor({ 'image/png': blob })
        await navigator.clipboard.write([item as ClipboardItem])
        setStatus('PNG скопирован в буфер')
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = 'chart.png'
        a.click()
        setStatus('Скачан PNG (буфер недоступен)')
      }
      setTimeout(() => setStatus(''), 1600)
    } catch {
      setStatus('Не удалось скопировать PNG')
      setTimeout(() => setStatus(''), 1600)
    }
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-card/80 p-3 ${fill ? 'h-full flex flex-col' : ''}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {cfg.type.toUpperCase()} | {cfg.x}
          {cfg.y ? ` vs ${cfg.y}` : ''}
        </p>
        <div className="flex items-center gap-2">
          {onExplain && (
            <button
              className="btn-ghost"
              onClick={() => {
                void onExplain().then((text) => setExplanation(text))
              }}
            >
              Explain
            </button>
          )}
          <span className="text-[11px] text-cyan-100/70">Tap chart to copy PNG</span>
        </div>
      </div>
      <div className={fill ? 'flex-1 min-h-0' : ''} onClick={() => void copyAsPng()}>
        <ReactECharts ref={chartRef} option={option} style={{ height: fill ? '100%' : 240, width: '100%' }} />
      </div>
      {status && <p className="mt-2 text-xs text-cyan-200">{status}</p>}
      {explanation && <p className="mt-2 text-sm text-cyan-50/90">{explanation}</p>}
    </div>
  )
}

export default ChartCard
