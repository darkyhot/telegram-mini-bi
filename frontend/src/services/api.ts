import type { AIProfile, AIQueryResponse, Dataset } from '../types/dataset'
import type { Dashboard } from '../types/dashboard'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function uploadCsv(file: File, telegramId: number): Promise<Dataset> {
  const body = new FormData()
  body.append('file', file)
  body.append('telegram_id', String(telegramId))

  const response = await fetch(`${API_BASE}/datasets/upload`, {
    method: 'POST',
    body,
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json()
}

export async function profileDataset(datasetId: number, telegramId: number): Promise<AIProfile> {
  const response = await fetch(`${API_BASE}/ai/profile/${datasetId}?telegram_id=${telegramId}`, { method: 'POST' })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json()
}

export async function askAi(datasetId: number, telegramId: number, question: string): Promise<AIQueryResponse> {
  const response = await fetch(`${API_BASE}/ai/query/${datasetId}?telegram_id=${telegramId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json()
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
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json()
}

export async function shareDashboard(id: number, telegramId: number): Promise<Dashboard> {
  const response = await fetch(`${API_BASE}/dashboards/${id}/share?telegram_id=${telegramId}`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json()
}

export async function getPublicDashboard(token: string): Promise<Dashboard> {
  const response = await fetch(`${API_BASE}/public/${token}`)
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json()
}
