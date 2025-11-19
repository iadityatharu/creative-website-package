import { StatusCode } from "../constant/statusCode.interface";
import { Message } from "../constant/message.interface";
export class expressError extends Error {
  status: number;
  constructor(
    status: number = StatusCode.INTERNAL_SERVER_ERROR,
    message: string = Message.INTERNAL_SERVER_ERROR
  ) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, expressError.prototype);
  }
}
