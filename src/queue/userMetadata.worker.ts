import { Job, Worker } from "bullmq";
import { redisConfig } from "../configs/redis.config";
import { UserMetadataJob } from "../constant/interface.constant";
import { AppDataSource } from "../configs/psqlDb.config";
import { UserMetadata } from "../entities/userMetaData.entity";
import { Logger } from "../utils/chalk";

export class UserMetadataWorker {
  static start(): void {
    const worker = new Worker<UserMetadataJob>(
      "user-metadata-queue",
      async (job: Job<UserMetadataJob>) => {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
        }

        const repo = AppDataSource.getRepository(UserMetadata);
        const payload = repo.create({
          userId: job.data.userId ?? null,
          ip: job.data.ip ?? null,
          country: job.data.country ?? null,
          city: job.data.city ?? null,
          region: job.data.region ?? null,
          os: job.data.os ?? null,
          browser: job.data.browser ?? null,
          device: job.data.device ?? null,
        });

        await repo.save(payload);
      },
      { connection: redisConfig }
    );

    worker.on("failed", (job, err) => {
      Logger.error(
        `User metadata job failed (id: ${job?.id ?? "unknown"}): ${err.message}`
      );
    });
  }
}
