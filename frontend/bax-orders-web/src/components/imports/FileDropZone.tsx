import { FileSpreadsheet } from 'lucide-react'
import { useRef, useState } from 'react'

interface FileDropZoneProps {
  file: File | null
  disabled: boolean
  onFileSelected: (file: File) => void
}

export function FileDropZone({ file, disabled, onFileSelected }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const dropped = event.dataTransfer.files[0]
        if (!disabled && dropped) onFileSelected(dropped)
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center ${
        dragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <FileSpreadsheet className="size-8 text-emerald-600" aria-hidden="true" />
      <p className="text-sm text-slate-700">
        Excel faylını bura sürükləyin və ya{' '}
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="font-medium text-emerald-700 hover:underline disabled:no-underline"
        >
          fayl seçin
        </button>
      </p>
      <p className="text-xs text-slate-500">Qəbul edilən formatlar: .xlsx, .xls</p>
      {file && (
        <p className="mt-2 text-sm text-slate-700">
          Seçilmiş fayl: <span className="font-medium">{file.name}</span>{' '}
          <span className="text-slate-500">({(file.size / 1024).toFixed(0)} KB)</span>
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0]
          if (selected) onFileSelected(selected)
          event.target.value = ''
        }}
      />
    </div>
  )
}
