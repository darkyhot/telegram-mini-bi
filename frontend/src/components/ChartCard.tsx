import ReactECharts from 'echarts-for-react'

import type { AIQueryResponse } from '../types/dataset'

type Props = {
  data: AIQueryResponse
  fill?: boolean
}

const ChartCard = ({ data, fill = false }: Props) => {
  const { chart_config: cfg, chart_data } = data

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: cfg.type === 'pie' ? 'item' : 'axis' },
    grid: cfg.type === 'pie' ? undefined : { top: 20, right: 12, bottom: 28, left: 42 },
    xAxis: cfg.type === 'pie' ? undefined : { type: 'category', data: chart_data.map((d) => d.x) },
    yAxis: cfg.type === 'pie' ? undefined : { type: 'value' },
    series:
      cfg.type === 'pie'
        ? [{ type: 'pie', radius: '65%', data: chart_data.map((d) => ({ name: d.x, value: d.y })) }]
        : [{ type: cfg.type === 'histogram' ? 'bar' : cfg.type, data: chart_data.map((d) => d.y), smooth: true }],
    textStyle: { color: '#e5e7eb' },
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-card/80 p-3 ${fill ? 'h-full flex flex-col' : ''}`}>
      <p className="mb-2 text-xs text-muted">
        {cfg.type.toUpperCase()} | {cfg.x}
        {cfg.y ? ` vs ${cfg.y}` : ''}
      </p>
      <div className={fill ? 'flex-1 min-h-0' : ''}>
        <ReactECharts option={option} style={{ height: fill ? '100%' : 240, width: '100%' }} />
      </div>
    </div>
  )
}

export default ChartCard
