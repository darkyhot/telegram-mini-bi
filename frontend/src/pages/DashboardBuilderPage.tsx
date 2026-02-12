import type { DashboardWidget } from '../types/dashboard'
import DashboardCanvas from '../components/DashboardCanvas'

const DashboardBuilderPage = ({
  widgets,
  onLayout,
  onSave,
  onShare,
}: {
  widgets: DashboardWidget[]
  onLayout: (widgets: DashboardWidget[]) => void
  onSave: () => Promise<void>
  onShare: () => Promise<void>
}) => {
  return (
    <section className="px-4 mt-5 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950" onClick={() => void onSave()}>
          Save Dashboard
        </button>
        <button className="rounded-md bg-white/10 px-3 py-2 text-sm" onClick={() => void onShare()}>
          Share Link
        </button>
      </div>
      <DashboardCanvas widgets={widgets} onLayout={onLayout} />
    </section>
  )
}

export default DashboardBuilderPage
