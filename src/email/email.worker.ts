import { Worker, Job } from "bullmq";
import nodemailer from "nodemailer";
import { redisConfig } from "../configs/redis.config";
import { EmailJob } from "../constant/interface.constant";
import { expressError } from "../utils/expressError";
import { StatusCode } from "../constant/statusCode.interface";
import { Message } from "../constant/interface.constant";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export class EmailWorker {
  static start() {
    const worker = new Worker<EmailJob>(
      "email-queue",
      async (job: Job<EmailJob>) => {
        await transporter.sendMail({
          from: ` <${process.env.SMTP_USER}>`,
          to: job.data.to,
          subject: job.data.subject,
          html: job.data.html,
        });
      },
      { connection: redisConfig }
    );

    worker.on("failed", (job, err) => {
      console.log(err);
      throw new expressError(StatusCode.BAD_REQUEST, Message.BAD_REQUEST);
    });
  }
}
