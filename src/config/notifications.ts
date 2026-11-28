export const NOTIFICATION_KINDS = ["task_assigned", "mentioned", "task_comment", "client_comment", "client_request", "request_update"] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export const NOTIFICATION_POLL_MS = 60_000
