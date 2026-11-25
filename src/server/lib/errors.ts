export class AppError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "BAD_REQUEST" | "UNAVAILABLE" = "BAD_REQUEST",
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const notFoundError = (entity: string) => new AppError(`${entity} was not found.`, "NOT_FOUND")
export const forbiddenError = () => new AppError("You do not have permission to do this.", "FORBIDDEN")
