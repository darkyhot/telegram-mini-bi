import SchemaPreview from '../components/SchemaPreview'
import InsightFeed from '../components/InsightFeed'
import type { Dataset } from '../types/dataset'

const DatasetOverviewPage = ({ dataset, insights }: { dataset: Dataset; insights: string[] }) => {
  return (
    <section className="grid gap-4 px-4 mt-5">
      <div className="rounded-xl border border-white/10 bg-card/70 p-4">
        <h2 className="text-lg font-medium">{dataset.name}</h2>
        <p className="text-sm text-muted mt-1">{dataset.row_count} rows, {dataset.column_count} columns</p>
      </div>
      <SchemaPreview schema={dataset.schema} />
      <InsightFeed insights={insights} />
    </section>
  )
}

export default DatasetOverviewPage
