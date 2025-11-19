import { Queue } from "bullmq";
import { redisConfig } from "../configs/redis.config";
import { EmailJob } from "../constant/interface.constant";

export class EmailQueue {
  private static queue = new Queue<EmailJob>("email-queue", {
    connection: redisConfig,
  });

  static async addEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<void> {
    await this.queue.add("send-email", { to, subject, html });
  }

  static async addBulkEmails(
    recipients: string[],
    subject: string,
    html: string
  ): Promise<void> {
    const jobs = recipients.map((to) => ({
      name: "send-email",
      data: { to, subject, html },
    }));
    await this.queue.addBulk(jobs);
  }
}
