import { Request, Response, NextFunction } from "express";
import { expressError } from "../utils/expressError";
import { StatusCode } from "../constant/statusCode.interface";
import { Message } from "../constant/message.interface";

export const globalErrorHandler = (
  err: expressError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(err);
  const status = err.status || StatusCode.INTERNAL_SERVER_ERROR;
  res.status(status).json({
    status: status,
    message: err.message || Message.INTERNAL_SERVER_ERROR,
  });
};
