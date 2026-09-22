import type { BaxOrdersRole } from '../api/auth'

export const roleLabels: Record<BaxOrdersRole, string> = {
  Coordinator: 'Koordinator',
  Manager: 'Rəhbər',
  Admin: 'Administrator',
}

export const roleOrder: BaxOrdersRole[] = ['Coordinator', 'Manager', 'Admin']

/** What each role is for, shown where somebody has to choose one for a colleague. */
export const roleDescriptions: Record<BaxOrdersRole, string> = {
  Coordinator: 'Excel idxalını aparır və sifarişləri təsdiqə göndərir.',
  Manager: 'Sifarişləri təsdiqləyir və ya düzəlişə qaytarır.',
  Admin: 'Hər ikisini edir, həmçinin istifadəçiləri idarə edir.',
}

export const authErrors = {
  badCredentials: 'İstifadəçi adı və ya şifrə yanlışdır.',
  sessionExpired: 'Sessiya bitib. Yenidən daxil olun.',
  forbidden: 'Bu əməliyyat üçün icazəniz yoxdur.',
  unknown: 'Əməliyyat yerinə yetirilmədi.',
  passwordMismatch: 'Yeni şifrələr uyğun gəlmir.',
} as const

/** Said where a request has no signed-in person behind it: imported before sign-in existed. */
export const systemActorLabel = 'Sistem'

export const historicalDraftOriginLabel = 'Tarixi import'
