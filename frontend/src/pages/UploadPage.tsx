import UploadDropzone from '../components/UploadDropzone'

const UploadPage = ({ onUpload }: { onUpload: (file: File) => Promise<void> }) => {
  return (
    <section className="max-w-4xl mx-auto mt-6 px-4">
      <UploadDropzone onUpload={onUpload} />
    </section>
  )
}

export default UploadPage
