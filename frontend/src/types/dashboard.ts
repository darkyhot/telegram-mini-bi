export type DashboardWidget = {
  id: string
  title: string
  chart_config: {
    type: 'bar' | 'line' | 'pie' | 'histogram'
    x: string
    y: string | null
    aggregation?: string | null
  }
  chart_data: Array<{ x: string; y: number }>
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
}
