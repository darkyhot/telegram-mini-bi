import type { SchemaColumn } from '../types/dataset'

const SchemaPreview = ({ schema }: { schema: SchemaColumn[] }) => {
  return (
    <div className="panel overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 text-sm text-cyan-100/75">Schema</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-cyan-100/65">
              <th className="px-4 py-2">Column</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Missing</th>
              <th className="px-4 py-2">Unique</th>
            </tr>
          </thead>
          <tbody>
            {schema.map((col) => (
              <tr key={col.name} className="border-t border-white/5">
                <td className="px-4 py-2">{col.name}</td>
                <td className="px-4 py-2">{col.dtype}</td>
                <td className="px-4 py-2">{col.missing}</td>
                <td className="px-4 py-2">{col.unique}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SchemaPreview
