export type SchemaColumn = {
  name: string
  dtype: string
  missing: number
  unique: number
}

export type Dataset = {
  id: number
  name: string
  row_count: number
  column_count: number
  schema: SchemaColumn[]
  sample: Record<string, unknown>[]
}

export type DatasetListItem = {
  id: number
  name: string
  row_count: number
  column_count: number
  created_at: string
}

export type AIProfile = {
  summary: string
  insights: string[]
  suggested_visualizations: Record<string, unknown>[]
}

export type AIQueryResponse = {
  answer: string
  pandas_query: string | null
  chart_config: {
    type: 'bar' | 'line' | 'pie' | 'histogram'
    x: string
    y: string | null
    aggregation?: string | null
    comparison?: boolean
    period?: 'day' | 'week' | 'month'
  }
  chart_data: Array<{ x: string; y?: number; current?: number; previous?: number | null }>
}

export type AIHistoryItem = {
  id: number
  question: string | null
  answer: string
  pandas_query: string | null
  chart_config: AIQueryResponse['chart_config'] | null
  chart_data: AIQueryResponse['chart_data'] | null
  attempts: number
  created_at: string
}

export type AIHistory = {
  profile: AIProfile | null
  queries: AIHistoryItem[]
}

export type CompareResponse = {
  summary: string
  chart_config: AIQueryResponse['chart_config']
  chart_data: AIQueryResponse['chart_data']
}

export type NL2DashboardWidget = {
  title: string
  chart_config: AIQueryResponse['chart_config']
  chart_data: AIQueryResponse['chart_data']
}

export type NL2DashboardResponse = {
  summary: string
  widgets: NL2DashboardWidget[]
}

export type ExplainResponse = {
  explanation: string
}

export type Team = {
  id: number
  name: string
  owner_telegram_id: number
  created_at: string
}

export type TeamMember = {
  team_id: number
  member_telegram_id: number
  role: 'owner' | 'editor' | 'viewer'
  created_at: string
}

export type DashboardComment = {
  id: number
  dashboard_id: number
  user_telegram_id: number
  text: string
  created_at: string
}
