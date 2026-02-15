import type { Dashboard } from '../types/dashboard'
import type {
  AIHistory,
  AIProfile,
  AIQueryResponse,
  CompareResponse,
  DashboardComment,
  Dataset,
  DatasetListItem,
  ExplainResponse,
  NL2DashboardResponse,
  Team,
  TeamMember,
} from '../types/dataset'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json()
}

export async function uploadCsv(file: File, telegramId: number): Promise<Dataset> {
  const body = new FormData()
  body.append('file', file)
  body.append('telegram_id', String(telegramId))

  const response = await fetch(`${API_BASE}/datasets/upload`, {
    method: 'POST',
    body,
  })
  return parseResponse<Dataset>(response)
}

export async function listDatasets(telegramId: number): Promise<DatasetListItem[]> {
  const response = await fetch(`${API_BASE}/datasets?telegram_id=${telegramId}`)
  return parseResponse<DatasetListItem[]>(response)
}

export async function getDataset(datasetId: number, telegramId: number): Promise<Dataset> {
  const response = await fetch(`${API_BASE}/datasets/${datasetId}?telegram_id=${telegramId}`)
  return parseResponse<Dataset>(response)
}

export async function profileDataset(datasetId: number, telegramId: number): Promise<AIProfile> {
  const response = await fetch(`${API_BASE}/ai/profile/${datasetId}?telegram_id=${telegramId}`, { method: 'POST' })
  return parseResponse<AIProfile>(response)
}

export async function getAiHistory(datasetId: number, telegramId: number): Promise<AIHistory> {
  const response = await fetch(`${API_BASE}/ai/history/${datasetId}?telegram_id=${telegramId}`)
  return parseResponse<AIHistory>(response)
}

export async function askAi(datasetId: number, telegramId: number, question: string): Promise<AIQueryResponse> {
  const response = await fetch(`${API_BASE}/ai/query/${datasetId}?telegram_id=${telegramId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  return parseResponse<AIQueryResponse>(response)
}

export async function comparePeriods(
  datasetId: number,
  telegramId: number,
  payload: { date_column: string; value_column: string; period: 'day' | 'week' | 'month' },
): Promise<CompareResponse> {
  const response = await fetch(`${API_BASE}/ai/compare/${datasetId}?telegram_id=${telegramId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<CompareResponse>(response)
}

export async function nl2dashboard(datasetId: number, telegramId: number, prompt: string): Promise<NL2DashboardResponse> {
  const response = await fetch(`${API_BASE}/ai/nl2dashboard/${datasetId}?telegram_id=${telegramId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  return parseResponse<NL2DashboardResponse>(response)
}

export async function explainChart(
  datasetId: number,
  telegramId: number,
  payload: { chart_config: Record<string, unknown>; chart_data: Array<Record<string, unknown>>; question?: string },
): Promise<ExplainResponse> {
  const response = await fetch(`${API_BASE}/ai/explain/${datasetId}?telegram_id=${telegramId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<ExplainResponse>(response)
}

export async function saveDashboard(params: {
  telegram_id: number
  dataset_id: number
  title: string
  config: Record<string, unknown>
  dashboard_id?: number
}): Promise<Dashboard> {
  const response = await fetch(`${API_BASE}/dashboards/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return parseResponse<Dashboard>(response)
}

export async function listDashboards(telegramId: number, datasetId?: number): Promise<Dashboard[]> {
  const query = datasetId ? `?telegram_id=${telegramId}&dataset_id=${datasetId}` : `?telegram_id=${telegramId}`
  const response = await fetch(`${API_BASE}/dashboards${query}`)
  return parseResponse<Dashboard[]>(response)
}

export async function shareDashboard(id: number, telegramId: number): Promise<Dashboard> {
  const response = await fetch(`${API_BASE}/dashboards/${id}/share?telegram_id=${telegramId}`, {
    method: 'POST',
  })
  return parseResponse<Dashboard>(response)
}

export async function shareDashboardToTeam(
  id: number,
  payload: { telegram_id: number; team_id: number; permission: 'viewer' | 'editor' },
): Promise<{ dashboard_id: number; team_id: number; permission: string; created_at: string }> {
  const response = await fetch(`${API_BASE}/dashboards/${id}/team-share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<{ dashboard_id: number; team_id: number; permission: string; created_at: string }>(response)
}

export async function listDashboardComments(dashboardId: number, telegramId: number): Promise<DashboardComment[]> {
  const response = await fetch(`${API_BASE}/dashboards/${dashboardId}/comments?telegram_id=${telegramId}`)
  return parseResponse<DashboardComment[]>(response)
}

export async function addDashboardComment(
  dashboardId: number,
  payload: { telegram_id: number; text: string },
): Promise<DashboardComment> {
  const response = await fetch(`${API_BASE}/dashboards/${dashboardId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<DashboardComment>(response)
}

export async function listTeams(telegramId: number): Promise<Team[]> {
  const response = await fetch(`${API_BASE}/teams?telegram_id=${telegramId}`)
  return parseResponse<Team[]>(response)
}

export async function createTeam(payload: { telegram_id: number; name: string }): Promise<Team> {
  const response = await fetch(`${API_BASE}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<Team>(response)
}

export async function listTeamMembers(teamId: number, telegramId: number): Promise<TeamMember[]> {
  const response = await fetch(`${API_BASE}/teams/${teamId}/members?telegram_id=${telegramId}`)
  return parseResponse<TeamMember[]>(response)
}

export async function addTeamMember(
  teamId: number,
  payload: { actor_telegram_id: number; member_telegram_id: number; role: 'owner' | 'editor' | 'viewer' },
): Promise<TeamMember> {
  const response = await fetch(`${API_BASE}/teams/${teamId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<TeamMember>(response)
}

export async function getPublicDashboard(token: string): Promise<Dashboard> {
  const response = await fetch(`${API_BASE}/public/${token}`)
  return parseResponse<Dashboard>(response)
}
