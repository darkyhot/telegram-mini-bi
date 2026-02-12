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
  }
  chart_data: Array<{ x: string; y: number }>
}
