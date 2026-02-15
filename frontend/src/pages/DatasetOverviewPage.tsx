import SchemaPreview from '../components/SchemaPreview'
import InsightFeed from '../components/InsightFeed'
import type { Dataset } from '../types/dataset'

const DatasetOverviewPage = ({ dataset, insights }: { dataset: Dataset; insights: string[] }) => {
  return (
    <section className="grid gap-4 mt-2">
      <div className="panel p-4">
        <h2 className="text-lg font-medium text-cyan-100">{dataset.name}</h2>
        <p className="text-sm text-cyan-100/70 mt-1">
          {dataset.row_count} rows, {dataset.column_count} columns
        </p>
      </div>
      <SchemaPreview schema={dataset.schema} />
      <InsightFeed insights={insights} />
    </section>
  )
}

export default DatasetOverviewPage
