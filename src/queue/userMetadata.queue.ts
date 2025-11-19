import { Queue } from "bullmq";
import { redisConfig } from "../configs/redis.config";
import { UserMetadataJob } from "../constant/interface.constant";

export class UserMetadataQueue {
  private static queue = new Queue<UserMetadataJob>("user-metadata-queue", {
    connection: redisConfig,
  });

  static async enqueue(metadata: UserMetadataJob): Promise<void> {
    await this.queue.add("user-metadata", metadata, {
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
  }
}
