import { create } from 'zustand'

import type { AIProfile, AIQueryResponse, Dataset } from '../types/dataset'
import type { Dashboard } from '../types/dashboard'

type Message = {
  role: 'user' | 'assistant'
  text: string
}

type AppState = {
  telegramId: number
  dataset: Dataset | null
  aiProfile: AIProfile | null
  messages: Message[]
  candidateChart: AIQueryResponse | null
  dashboard: Dashboard | null
  setTelegramId: (id: number) => void
  setDataset: (dataset: Dataset | null) => void
  setAiProfile: (profile: AIProfile | null) => void
  pushMessage: (msg: Message) => void
  setCandidateChart: (resp: AIQueryResponse | null) => void
  setDashboard: (dashboard: Dashboard | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  telegramId: 0,
  dataset: null,
  aiProfile: null,
  messages: [],
  candidateChart: null,
  dashboard: null,
  setTelegramId: (telegramId) => set({ telegramId }),
  setDataset: (dataset) => set({ dataset }),
  setAiProfile: (aiProfile) => set({ aiProfile }),
  pushMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setCandidateChart: (candidateChart) => set({ candidateChart }),
  setDashboard: (dashboard) => set({ dashboard }),
}))
