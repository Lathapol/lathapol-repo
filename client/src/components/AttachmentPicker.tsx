import { useRef } from 'react'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const MAX_FILES = 5

export interface PickedFile {
  file: File
  error?: string
}

interface Props {
  files: PickedFile[]
  onChange: (files: PickedFile[]) => void
}

export default function AttachmentPicker({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function validateFile(file: File): string | undefined {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Unsupported file type. Allowed: JPG, PNG, WEBP, PDF.'
    }
    if (file.size > MAX_SIZE_BYTES) {
      return 'File exceeds the 5 MB size limit.'
    }
    return undefined
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    const remainingSlots = MAX_FILES - files.length
    if (remainingSlots <= 0) {
      onChange([
        ...files,
        ...selected.map((file) => ({
          file,
          error: 'Maximum of 5 attachments per ticket reached.',
        })),
      ])
    } else {
      const newFiles: PickedFile[] = selected.map((file) => ({
        file,
        error: validateFile(file),
      }))
      onChange([...files, ...newFiles])
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">Attachments</label>
      <input
        ref={inputRef}
        type="file"
        className="form-control"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={handleFilesSelected}
      />
      <div className="form-text">
        Up to 5 files. JPG, PNG, WEBP, or PDF only. Max 5 MB each.
      </div>

      {files.length > 0 && (
        <ul className="list-group mt-2">
          {files.map((f, i) => (
            <li
              key={i}
              className={`list-group-item d-flex justify-content-between align-items-center ${
                f.error ? 'list-group-item-danger' : ''
              }`}
            >
              <div>
                <div>{f.file.name}</div>
                <small className="text-muted">
                  {(f.file.size / 1024).toFixed(0)} KB
                </small>
                {f.error && (
                  <div className="text-danger small mt-1">{f.error}</div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeFile(i)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
