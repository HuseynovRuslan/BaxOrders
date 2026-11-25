import { useCallback, useRef, useState } from 'react'

/*
 * «Excel kimi endir»: the site's figures saved as an Excel file in the viewer's browser — nothing goes to the server, so
 * it works wherever the figures can be read. The file's maker is loaded only when asked for (data/backup.ts), so the
 * pages do not carry it.
 */

export type BackupState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; fileName: string; lines: number }
  | { kind: 'error'; message: string }

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function save(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: XLSX }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // The browser has the file by the time this runs; the address is let go so the memory is.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function useBackupDownload() {
  const [state, setState] = useState<BackupState>({ kind: 'idle' })
  const running = useRef(false)

  const start = useCallback(async () => {
    if (running.current) return
    running.current = true
    setState({ kind: 'busy' })
    try {
      const { siteBackup } = await import('../data/backup')
      // A moment for «Hazırlanır…» to show before the file is made in one go.
      await new Promise((resolve) => window.setTimeout(resolve, 0))
      const { bytes, fileName, lines } = siteBackup(new Date())
      save(bytes, fileName)
      setState({ kind: 'done', fileName, lines })
    } catch (error) {
      const reason = error instanceof Error && error.name === 'BackupError' ? ` ${error.message}` : ' Səhifəni yeniləyib yenidən yoxlayın.'
      setState({ kind: 'error', message: `Excel faylı hazırlanmadı.${reason}` })
    } finally {
      running.current = false
    }
  }, [])

  return { state, start }
}
