import { canAccessPayloadDashboard } from '@/utilities/isEditorialUser'

export const payloadDashboardAccess = ({ req: { user } }: { req: { user?: unknown } }) => {
  return canAccessPayloadDashboard(user)
}
