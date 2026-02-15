import type { DashboardWidget } from '../types/dashboard'
import DashboardCanvas from '../components/DashboardCanvas'

const DashboardBuilderPage = ({
  widgets,
  onLayout,
}: {
  widgets: DashboardWidget[]
  onLayout: (widgets: DashboardWidget[]) => void
}) => {
  return (
    <section className="space-y-3">
      <div className="panel p-3 text-xs text-cyan-100/80">
        {widgets.length ? 'Drag widgets by header and resize from bottom-right corner.' : 'Ask AI and add first chart to start your dashboard.'}
      </div>
      <DashboardCanvas widgets={widgets} onLayout={onLayout} />
    </section>
  )
}

export default DashboardBuilderPage
