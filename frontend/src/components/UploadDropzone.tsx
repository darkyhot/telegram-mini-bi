import { useRef, useState } from 'react'

type Props = {
  onUpload: (file: File) => Promise<void>
}

const UploadDropzone = ({ onUpload }: Props) => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = async (file?: File) => {
    if (!file) return
    setError('')
    setBusy(true)
    try {
      await onUpload(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="rounded-xl border border-dashed border-white/20 bg-card/70 p-6 text-center shadow-glow"
      onDrop={(e) => {
        e.preventDefault()
        void handleFile(e.dataTransfer.files?.[0])
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <h2 className="text-lg font-medium">Drop CSV here</h2>
      <p className="mt-2 text-sm text-muted">Max 10MB, up to 100k rows</p>
      <button
        className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? 'Uploading...' : 'Choose CSV'}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  )
}

export default UploadDropzone
