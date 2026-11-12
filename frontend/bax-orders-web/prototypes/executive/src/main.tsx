/**
 * The figures first, then the app. The owner's workbook lives beside the page as data/real-data.json — the «Excel
 * yüklə» button replaces it on the server — so it is read here, before any module that counts with it is loaded.
 * Without it (a copy with no data file) the prototype runs on its demo, and says so. Beside it, data/approvals.json:
 * the Rəhbər's monthly approvals, kept apart so a new workbook never touches them.
 */
async function read(name: string, global: '__BAX_DATA__' | '__BAX_APPROVALS__') {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${name}`, { cache: 'no-store' })
    if (response.ok) (globalThis as Record<string, unknown>)[global] = await response.json()
  } catch {
    // No file, or not JSON: the demo, or the approvals as the program left them.
  }
}

async function start() {
  await Promise.all([read('real-data.json', '__BAX_DATA__'), read('approvals.json', '__BAX_APPROVALS__')])
  await import('./app')
}

void start()
