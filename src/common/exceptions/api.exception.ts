import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    statusCode: number,
    message: string,
    public readonly details?: any,
  ) {
    super({ error: message, details }, statusCode);
  }
}


export class NotFoundException extends ApiException {
  constructor(resource: string) {
    super(HttpStatus.NOT_FOUND, `${resource} not found`);
  }
}
