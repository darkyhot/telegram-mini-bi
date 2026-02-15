export type DashboardWidget = {
  id: string
  title: string
  chart_config: {
    type: 'bar' | 'line' | 'pie' | 'histogram'
    x: string
    y: string | null
    aggregation?: string | null
    comparison?: boolean
    period?: 'day' | 'week' | 'month'
  }
  chart_data: Array<{ x: string; y?: number; current?: number; previous?: number | null }>
  layout: { x: number; y: number; w: number; h: number }
}

export type DashboardConfig = {
  widgets: DashboardWidget[]
}

export type Dashboard = {
  id: number
  title: string
  dataset_id: number
  config: DashboardConfig
  share_token: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}
