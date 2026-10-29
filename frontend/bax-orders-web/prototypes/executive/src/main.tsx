/**
 * The figures first, then the app. The owner's workbook lives beside the page as data/real-data.json — the «Excel
 * yüklə» button replaces it on the server — so it is read here, before any module that counts with it is loaded.
 * Without it (a copy with no data file) the prototype runs on its demo, and says so.
 */
async function start() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/real-data.json`, { cache: 'no-store' })
    if (response.ok) (globalThis as { __BAX_DATA__?: unknown }).__BAX_DATA__ = await response.json()
  } catch {
    // No data file, or not JSON: the demo.
  }
  await import('./app')
}

void start()
