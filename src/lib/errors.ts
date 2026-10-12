
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Не найдено') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Требуется авторизация') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}
