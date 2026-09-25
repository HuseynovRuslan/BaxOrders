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
  Manager: 'Sifarişləri təsdiqləyir və ya düzəliş tələb edir. Təsdiq səlahiyyəti bu roldadır.',
  Admin: 'Excel idxalını aparır, sifarişləri təsdiqə göndərir və istifadəçiləri idarə edir. Təsdiq səlahiyyəti yoxdur.',
}

/** Shown on the users page whenever nobody active holds approval authority. */
export const noApproverWarning =
  'Təsdiq səlahiyyəti olan aktiv istifadəçi yoxdur. Sifarişləri heç kim təsdiqləyə bilmir. Rəhbər rolu ilə istifadəçi yaradın.'

export const authErrors = {
  badCredentials: 'İstifadəçi adı və ya şifrə yanlışdır.',
  sessionExpired: 'Sessiya bitib. Yenidən daxil olun.',
  forbidden: 'Bu əməliyyat üçün icazəniz yoxdur.',
  unknown: 'Əməliyyat yerinə yetirilmədi.',
  passwordMismatch: 'Yeni şifrələr uyğun gəlmir.',
} as const

/** Said on a page the reader may look at and not change — Təchizatçılar and Qiymət təsnifatı for a Rəhbər (14.1). */
export const readOnlyNote = 'Yalnız baxış: bu bölmədə dəyişiklik etmək səlahiyyətiniz yoxdur.'

/** Said where a request has no signed-in person behind it: imported before sign-in existed. */
export const systemActorLabel = 'Sistem'

export const historicalDraftOriginLabel = 'Tarixi import'
