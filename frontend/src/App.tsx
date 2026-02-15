import { useEffect, useMemo, useState } from 'react'
import WebApp from '@twa-dev/sdk'

import AIChatPanel from './components/AIChatPanel'
import ChartCard from './components/ChartCard'
import Header from './components/Header'
import {
  addDashboardComment,
  addTeamMember,
  askAi,
  comparePeriods,
  createTeam,
  explainChart,
  getAiHistory,
  getDataset,
  getPublicDashboard,
  listDashboardComments,
  listDashboards,
  listDatasets,
  listTeamMembers,
  listTeams,
  nl2dashboard,
  profileDataset,
  saveDashboard,
  shareDashboard,
  shareDashboardToTeam,
  uploadCsv,
} from './services/api'
import { useAppStore } from './store/useAppStore'
import type { Dashboard, DashboardWidget } from './types/dashboard'
import type { AIQueryResponse, DashboardComment, DatasetListItem, Team, TeamMember } from './types/dataset'
import DashboardBuilderPage from './pages/DashboardBuilderPage'
import DatasetOverviewPage from './pages/DatasetOverviewPage'
import UploadPage from './pages/UploadPage'

const SELECTED_DATASET_KEY = 'mini-bi-selected-dataset'
const SELECTED_DASHBOARD_KEY = 'mini-bi-selected-dashboard'

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
    messages,
    setMessages,
    pushMessage,
  } = useAppStore()

  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [publicError, setPublicError] = useState('')
  const [workspaceError, setWorkspaceError] = useState('')
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [datasets, setDatasets] = useState<DatasetListItem[]>([])
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [dashboardTitle, setDashboardTitle] = useState('My BI Dashboard')

  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<number>(0)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteTelegramId, setInviteTelegramId] = useState('')

  const [comments, setComments] = useState<DashboardComment[]>([])
  const [commentText, setCommentText] = useState('')

  const [compareDateColumn, setCompareDateColumn] = useState('')
  const [compareValueColumn, setCompareValueColumn] = useState('')
  const [comparePeriod, setComparePeriod] = useState<'day' | 'week' | 'month'>('month')
  const [compareChart, setCompareChart] = useState<AIQueryResponse | null>(null)

  const [nlPrompt, setNlPrompt] = useState('Собери дашборд по ключевой динамике, категориям и аномалиям')

  useEffect(() => {
    const id = WebApp.initDataUnsafe?.user?.id
    if (id) {
      setTelegramId(id)
    }
  }, [setTelegramId])

  const activeTelegramId = telegramId || 1
  const isPublicView = window.location.pathname.startsWith('/public/')

  const hydrateDatasetWorkspace = async (datasetId: number) => {
    const [fullDataset, history, dashList] = await Promise.all([
      getDataset(datasetId, activeTelegramId),
      getAiHistory(datasetId, activeTelegramId),
      listDashboards(activeTelegramId, datasetId),
    ])

    setDataset(fullDataset)
    setAiProfile(history.profile)

    const hydratedMessages = history.queries.flatMap((q) => {
      const parts: Array<{ role: 'user' | 'assistant'; text: string }> = []
      if (q.question) parts.push({ role: 'user', text: q.question })
      parts.push({ role: 'assistant', text: q.answer })
      return parts
    })
    setMessages(hydratedMessages)

    setDashboards(dashList)

    const preferredDashboardId = Number(localStorage.getItem(SELECTED_DASHBOARD_KEY) || dashboard?.id || 0)
    const selected = dashList.find((d) => d.id === preferredDashboardId) ?? dashList[0] ?? null
    setDashboard(selected)
    setDashboardTitle(selected?.title ?? 'My BI Dashboard')
    setWidgets(selected?.config?.widgets ?? [])
    localStorage.setItem(SELECTED_DATASET_KEY, String(datasetId))
    if (selected?.id) {
      localStorage.setItem(SELECTED_DASHBOARD_KEY, String(selected.id))
    }

    const dateCandidates = fullDataset.schema.filter((c) => c.dtype.includes('date') || c.dtype.includes('datetime'))
    const valueCandidates = fullDataset.schema.filter((c) =>
      ['int', 'float', 'double', 'number'].some((token) => c.dtype.toLowerCase().includes(token)),
    )
    setCompareDateColumn(dateCandidates[0]?.name ?? fullDataset.schema[0]?.name ?? '')
    setCompareValueColumn(valueCandidates[0]?.name ?? fullDataset.schema[1]?.name ?? fullDataset.schema[0]?.name ?? '')
  }

  const hydrateWorkspace = async () => {
    if (isPublicView) return
    setWorkspaceBusy(true)
    setWorkspaceError('')
    try {
      const [datasetList, teamList] = await Promise.all([listDatasets(activeTelegramId), listTeams(activeTelegramId)])
      setDatasets(datasetList)
      setTeams(teamList)
      if (!selectedTeamId && teamList[0]) {
        setSelectedTeamId(teamList[0].id)
      }

      if (!datasetList.length) {
        setDataset(null)
        setAiProfile(null)
        setDashboard(null)
        setDashboards([])
        setWidgets([])
        setMessages([])
        return
      }

      const preferredDatasetId = Number(localStorage.getItem(SELECTED_DATASET_KEY) || dataset?.id || datasetList[0].id)
      const selected = datasetList.find((d) => d.id === preferredDatasetId) ?? datasetList[0]
      await hydrateDatasetWorkspace(selected.id)
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : 'Failed to load workspace')
    } finally {
      setWorkspaceBusy(false)
    }
  }

  useEffect(() => {
    if (isPublicView) return
    void hydrateWorkspace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTelegramId, isPublicView])

  useEffect(() => {
    if (!selectedTeamId) {
      setTeamMembers([])
      return
    }
    void listTeamMembers(selectedTeamId, activeTelegramId)
      .then(setTeamMembers)
      .catch(() => setTeamMembers([]))
  }, [selectedTeamId, activeTelegramId])

  useEffect(() => {
    if (!dashboard) {
      setComments([])
      return
    }
    void listDashboardComments(dashboard.id, activeTelegramId)
      .then(setComments)
      .catch(() => setComments([]))
  }, [dashboard, activeTelegramId])

  useEffect(() => {
    if (!isPublicView) return
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
  }, [isPublicView, setDashboard])

  const onUpload = async (file: File) => {
    const uploaded = await uploadCsv(file, activeTelegramId)
    await profileDataset(uploaded.id, activeTelegramId)
    await hydrateWorkspace()
    await hydrateDatasetWorkspace(uploaded.id)
  }

  const onSelectDataset = async (datasetId: number) => {
    await hydrateDatasetWorkspace(datasetId)
  }

  const onSelectDashboard = (dashboardId: number) => {
    const selected = dashboards.find((d) => d.id === dashboardId)
    if (!selected) return
    setDashboard(selected)
    setDashboardTitle(selected.title)
    setWidgets(selected.config?.widgets ?? [])
    localStorage.setItem(SELECTED_DASHBOARD_KEY, String(selected.id))
  }

  const onCreateNewDashboard = () => {
    setDashboard(null)
    setDashboardTitle('New Dashboard')
    setWidgets([])
    localStorage.removeItem(SELECTED_DASHBOARD_KEY)
  }

  const addChartToDashboard = (chart?: AIQueryResponse | null) => {
    const source = chart ?? candidateChart
    if (!source) return
    const id = `widget_${Date.now()}`
    const next: DashboardWidget = {
      id,
      title: source.answer.slice(0, 48) || 'AI Chart',
      chart_config: source.chart_config,
      chart_data: source.chart_data,
      layout: { x: 0, y: Infinity, w: 6, h: 4 },
    }
    setWidgets((prev) => [...prev, next])
    if (!chart) setCandidateChart(null)
  }

  const canSave = useMemo(() => Boolean(dataset && widgets.length && dashboardTitle.trim().length), [dataset, widgets.length, dashboardTitle])

  const onSaveDashboard = async () => {
    if (!dataset || !canSave) return
    const saved = await saveDashboard({
      telegram_id: activeTelegramId,
      dataset_id: dataset.id,
      title: dashboardTitle.trim(),
      dashboard_id: dashboard?.id,
      config: { widgets },
    })
    setDashboard(saved)
    setDashboardTitle(saved.title)
    const updated = await listDashboards(activeTelegramId, dataset.id)
    setDashboards(updated)
    localStorage.setItem(SELECTED_DASHBOARD_KEY, String(saved.id))
  }

  const onShareDashboard = async () => {
    if (!dashboard) return
    const shared = await shareDashboard(dashboard.id, activeTelegramId)
    setDashboard(shared)
    const updated = dashboards.map((d) => (d.id === shared.id ? shared : d))
    setDashboards(updated)
    if (shared.share_token) {
      WebApp.showPopup({
        title: 'Share Ready',
        message: `${window.location.origin}/public/${shared.share_token}`,
        buttons: [{ type: 'ok' }],
      })
    }
  }

  const onShareToTeam = async () => {
    if (!dashboard || !selectedTeamId) return
    await shareDashboardToTeam(dashboard.id, {
      telegram_id: activeTelegramId,
      team_id: selectedTeamId,
      permission: 'editor',
    })
  }

  const onCreateTeam = async () => {
    if (!newTeamName.trim()) return
    const t = await createTeam({ telegram_id: activeTelegramId, name: newTeamName.trim() })
    setTeams((prev) => [t, ...prev])
    setSelectedTeamId(t.id)
    setNewTeamName('')
  }

  const onInviteMember = async () => {
    if (!selectedTeamId || !inviteTelegramId.trim()) return
    const row = await addTeamMember(selectedTeamId, {
      actor_telegram_id: activeTelegramId,
      member_telegram_id: Number(inviteTelegramId),
      role: 'viewer',
    })
    setTeamMembers((prev) => [...prev, row])
    setInviteTelegramId('')
  }

  const onAddComment = async () => {
    if (!dashboard || !commentText.trim()) return
    const c = await addDashboardComment(dashboard.id, {
      telegram_id: activeTelegramId,
      text: commentText.trim(),
    })
    setComments((prev) => [...prev, c])
    setCommentText('')
  }

  const onComparePeriods = async () => {
    if (!dataset || !compareDateColumn || !compareValueColumn) return
    const result = await comparePeriods(dataset.id, activeTelegramId, {
      date_column: compareDateColumn,
      value_column: compareValueColumn,
      period: comparePeriod,
    })
    const chart: AIQueryResponse = {
      answer: result.summary,
      pandas_query: null,
      chart_config: result.chart_config,
      chart_data: result.chart_data,
    }
    setCompareChart(chart)
  }

  const onNl2Dashboard = async () => {
    if (!dataset || !nlPrompt.trim()) return
    const result = await nl2dashboard(dataset.id, activeTelegramId, nlPrompt.trim())
    const nextWidgets: DashboardWidget[] = result.widgets.map((w, idx) => ({
      id: `ai_widget_${Date.now()}_${idx}`,
      title: w.title,
      chart_config: w.chart_config,
      chart_data: w.chart_data,
      layout: { x: (idx % 2) * 6, y: Math.floor(idx / 2) * 4, w: 6, h: 4 },
    }))
    setWidgets(nextWidgets)
  }

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

      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 mt-4">
        {workspaceError && <p className="text-red-400 text-sm">{workspaceError}</p>}
        {workspaceBusy && <p className="text-xs text-muted">Loading workspace...</p>}

        {dataset && (
          <section className="panel p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="field-label">Dataset</label>
                <select className="field-input" value={dataset.id} onChange={(e) => void onSelectDataset(Number(e.target.value))}>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.row_count} rows)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Dashboard</label>
                <select
                  className="field-input"
                  value={dashboard?.id ?? 0}
                  onChange={(e) => {
                    const nextId = Number(e.target.value)
                    if (nextId === 0) return onCreateNewDashboard()
                    onSelectDashboard(nextId)
                  }}
                >
                  <option value={0}>New dashboard</option>
                  {dashboards.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Title</label>
                <input className="field-input" value={dashboardTitle} onChange={(e) => setDashboardTitle(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-neon" onClick={() => void onSaveDashboard()} disabled={!canSave}>
                Save Dashboard
              </button>
              <button className="btn-ghost" onClick={() => void onShareDashboard()} disabled={!dashboard}>
                Public Link
              </button>
              <button className="btn-ghost" onClick={onCreateNewDashboard}>
                New Dashboard
              </button>
            </div>
          </section>
        )}

        {dataset && (
          <section className="panel p-4 space-y-3">
            <h3 className="text-sm font-semibold">Командный доступ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="field-label">Команда</label>
                <select className="field-input" value={selectedTeamId} onChange={(e) => setSelectedTeamId(Number(e.target.value))}>
                  <option value={0}>Выберите команду</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Новая команда</label>
                <div className="flex gap-2">
                  <input className="field-input" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Название" />
                  <button className="btn-ghost" onClick={() => void onCreateTeam()}>
                    Create
                  </button>
                </div>
              </div>
              <div>
                <label className="field-label">Добавить участника (telegram_id)</label>
                <div className="flex gap-2">
                  <input className="field-input" value={inviteTelegramId} onChange={(e) => setInviteTelegramId(e.target.value)} />
                  <button className="btn-ghost" onClick={() => void onInviteMember()}>
                    Invite
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => void onShareToTeam()} disabled={!dashboard || !selectedTeamId}>
                Share dashboard to team
              </button>
            </div>
            {!!teamMembers.length && (
              <div className="text-xs text-cyan-100/70">
                Members:{' '}
                {teamMembers.map((m) => `${m.member_telegram_id} (${m.role})`).join(', ')}
              </div>
            )}
          </section>
        )}

        {dataset && (
          <section className="panel p-4 space-y-3">
            <h3 className="text-sm font-semibold">NL2Dashboard</h3>
            <div className="flex flex-col md:flex-row gap-2">
              <input className="field-input flex-1" value={nlPrompt} onChange={(e) => setNlPrompt(e.target.value)} />
              <button className="btn-neon" onClick={() => void onNl2Dashboard()}>
                Generate Dashboard
              </button>
            </div>
          </section>
        )}

        {dataset && (
          <section className="panel p-4 space-y-3">
            <h3 className="text-sm font-semibold">Сравнение периодов</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select className="field-input" value={compareDateColumn} onChange={(e) => setCompareDateColumn(e.target.value)}>
                {dataset.schema.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select className="field-input" value={compareValueColumn} onChange={(e) => setCompareValueColumn(e.target.value)}>
                {dataset.schema.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select className="field-input" value={comparePeriod} onChange={(e) => setComparePeriod(e.target.value as 'day' | 'week' | 'month')}>
                <option value="day">day</option>
                <option value="week">week</option>
                <option value="month">month</option>
              </select>
              <button className="btn-neon" onClick={() => void onComparePeriods()}>
                Compare
              </button>
            </div>
            {compareChart && (
              <div className="space-y-2">
                <ChartCard data={compareChart} />
                <button className="btn-ghost" onClick={() => addChartToDashboard(compareChart)}>
                  Add compare chart to dashboard
                </button>
              </div>
            )}
          </section>
        )}

        {dataset && <DatasetOverviewPage dataset={dataset} insights={aiProfile?.insights ?? []} />}

        {dataset && (
          <section>
            <AIChatPanel
              onAsk={async (question) => {
                pushMessage({ role: 'user', text: question })
                try {
                  const result = await askAi(dataset.id, activeTelegramId, question)
                  pushMessage({ role: 'assistant', text: result.answer })
                  setCandidateChart(result)
                } catch (err) {
                  pushMessage({ role: 'assistant', text: err instanceof Error ? err.message : 'AI error' })
                }
              }}
              messages={messages}
            />
          </section>
        )}

        {candidateChart && dataset && (
          <section className="space-y-3">
            <ChartCard
              data={candidateChart}
              onExplain={async () => {
                const resp = await explainChart(dataset.id, activeTelegramId, {
                  chart_config: candidateChart.chart_config,
                  chart_data: candidateChart.chart_data,
                  question: 'Объясни график простыми словами на русском',
                })
                return resp.explanation
              }}
            />
            <button className="btn-neon" onClick={() => addChartToDashboard()}>
              Add Chart To Dashboard
            </button>
          </section>
        )}

        {dataset && <DashboardBuilderPage widgets={widgets} onLayout={setWidgets} />}

        {dashboard && (
          <section className="panel p-4 space-y-2">
            <h3 className="text-sm font-semibold">Комментарии к дашборду</h3>
            <div className="space-y-2 max-h-44 overflow-auto">
              {comments.map((c) => (
                <div key={c.id} className="rounded-md border border-white/10 bg-slate-900/40 p-2 text-sm">
                  <span className="text-cyan-100/70">{c.user_telegram_id}: </span>
                  {c.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="field-input" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Добавить комментарий" />
              <button className="btn-ghost" onClick={() => void onAddComment()}>
                Send
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
