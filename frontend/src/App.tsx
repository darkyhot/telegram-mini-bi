import { useEffect, useMemo, useState } from 'react'
import WebApp from '@twa-dev/sdk'

import AIChatPanel from './components/AIChatPanel'
import ChartCard from './components/ChartCard'
import Header from './components/Header'
import { getPublicDashboard, profileDataset, saveDashboard, shareDashboard, uploadCsv } from './services/api'
import { useAppStore } from './store/useAppStore'
import type { DashboardWidget } from './types/dashboard'
import DashboardBuilderPage from './pages/DashboardBuilderPage'
import DatasetOverviewPage from './pages/DatasetOverviewPage'
import UploadPage from './pages/UploadPage'

function App() {
  const {
    telegramId,
    setTelegramId,
    dataset,
    setDataset,
    aiProfile,
    setAiProfile,
    candidateChart,
    setCandidateChart,
    dashboard,
    setDashboard,
  } = useAppStore()

  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [publicError, setPublicError] = useState('')

  useEffect(() => {
    const id = WebApp.initDataUnsafe?.user?.id
    if (id) setTelegramId(id)
  }, [setTelegramId])

  useEffect(() => {
    const path = window.location.pathname
    const publicMatch = path.match(/^\/public\/([^/]+)$/)
    if (!publicMatch) return

    const token = publicMatch[1]
    void (async () => {
      try {
        const dash = await getPublicDashboard(token)
        setDashboard(dash)
        const cfg = dash.config as { widgets?: DashboardWidget[] }
        setWidgets(cfg.widgets ?? [])
      } catch (err) {
        setPublicError(err instanceof Error ? err.message : 'Failed to load public dashboard')
      }
    })()
  }, [setDashboard])

  const activeTelegramId = telegramId || 1

  const onUpload = async (file: File) => {
    const uploaded = await uploadCsv(file, activeTelegramId)
    setDataset(uploaded)
    const prof = await profileDataset(uploaded.id, activeTelegramId)
    setAiProfile(prof)
  }

  const addChartToDashboard = () => {
    if (!candidateChart) return
    const id = `widget_${Date.now()}`
    const next: DashboardWidget = {
      id,
      title: candidateChart.answer.slice(0, 48) || 'AI Chart',
      chart_config: candidateChart.chart_config,
      chart_data: candidateChart.chart_data,
      layout: { x: 0, y: Infinity, w: 6, h: 4 },
    }
    setWidgets((prev) => [...prev, next])
    setCandidateChart(null)
  }

  const canSave = useMemo(() => Boolean(dataset && widgets.length), [dataset, widgets.length])

  const onSaveDashboard = async () => {
    if (!dataset || !canSave) return
    const saved = await saveDashboard({
      telegram_id: activeTelegramId,
      dataset_id: dataset.id,
      title: dashboard?.title ?? 'My BI Dashboard',
      dashboard_id: dashboard?.id,
      config: { widgets },
    })
    setDashboard(saved)
  }

  const onShareDashboard = async () => {
    if (!dashboard) return
    const shared = await shareDashboard(dashboard.id, activeTelegramId)
    setDashboard(shared)
    if (shared.share_token) {
      WebApp.showPopup({
        title: 'Share Ready',
        message: `${window.location.origin}/public/${shared.share_token}`,
        buttons: [{ type: 'ok' }],
      })
    }
  }

  const isPublicView = window.location.pathname.startsWith('/public/')

  if (isPublicView) {
    return (
      <div className="min-h-screen pb-10">
        <Header telegramId={activeTelegramId} />
        <main className="mx-auto max-w-6xl px-4 mt-6">
          {publicError && <p className="text-red-400 text-sm">{publicError}</p>}
          {!publicError && widgets.length === 0 && <p className="text-sm text-muted">Loading dashboard...</p>}
          {widgets.length > 0 && (
            <section className="space-y-3">
              {widgets.map((w) => (
                <div key={w.id} className="rounded-xl border border-white/10 bg-card/70 p-3">
                  <p className="text-xs text-muted mb-2">{w.title}</p>
                  <ChartCard data={{ answer: '', pandas_query: null, chart_config: w.chart_config, chart_data: w.chart_data }} />
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-10">
      <Header telegramId={activeTelegramId} />
      {!dataset && <UploadPage onUpload={onUpload} />}

      {dataset && (
        <main className="mx-auto w-full max-w-6xl space-y-4">
          <DatasetOverviewPage dataset={dataset} insights={aiProfile?.insights ?? []} />

          <section className="px-4">
            <AIChatPanel />
          </section>

          {candidateChart && (
            <section className="px-4 space-y-3">
              <ChartCard data={candidateChart} />
              <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950" onClick={addChartToDashboard}>
                Add Chart To Dashboard
              </button>
            </section>
          )}

          <DashboardBuilderPage
            widgets={widgets}
            onLayout={setWidgets}
            onSave={onSaveDashboard}
            onShare={onShareDashboard}
          />
        </main>
      )}
    </div>
  )
}

export default App
