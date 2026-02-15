import { Responsive, WidthProvider, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

import type { DashboardWidget } from '../types/dashboard'
import ChartCard from './ChartCard'

type Props = {
  widgets: DashboardWidget[]
  onLayout: (widgets: DashboardWidget[]) => void
}

const ResponsiveGridLayout = WidthProvider(Responsive)

const DashboardCanvas = ({ widgets, onLayout }: Props) => {
  const layouts = {
    lg: widgets.map((w) => ({ i: w.id, ...w.layout, minW: 1, minH: 3 })),
  }

  const syncWidgets = (next: Layout[]) => {
    const updated = widgets.map((w) => {
      const matched = next.find((n) => n.i === w.id)
      return matched ? { ...w, layout: { x: matched.x, y: matched.y, w: matched.w, h: matched.h } } : w
    })
    onLayout(updated)
  }

  return (
    <div className="panel p-3 overflow-hidden">
      <ResponsiveGridLayout
        className="grid-layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 2, xxs: 1 }}
        rowHeight={68}
        compactType="vertical"
        preventCollision={false}
        autoSize
        isResizable
        isDraggable
        draggableHandle=".widget-drag-handle"
        draggableCancel=".widget-content"
        resizeHandles={['se']}
        margin={[10, 10]}
        containerPadding={[0, 0]}
        onDragStop={syncWidgets}
        onResizeStop={syncWidgets}
      >
        {widgets.map((w) => (
          <div key={w.id} className="rounded-md overflow-hidden bg-slate-900/60 border border-white/10 h-full flex flex-col min-h-0">
            <div className="widget-drag-handle px-3 py-2 text-xs text-cyan-100/70 border-b border-white/10 cursor-move select-none">
              {w.title}
            </div>
            <div className="widget-content flex-1 min-h-0 p-2">
              <ChartCard
                fill
                data={{
                  answer: '',
                  pandas_query: null,
                  chart_config: w.chart_config,
                  chart_data: w.chart_data,
                }}
              />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}

export default DashboardCanvas
