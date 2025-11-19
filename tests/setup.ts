/// <reference types="jest" />

process.env.NODE_ENV = "test";
process.env.ALLOWED_ORIGINS = "";

const noop = () => undefined;
const asyncNoop = async () => undefined;

jest.mock("../src/email/email.worker", () => ({
  EmailWorker: { start: jest.fn() },
}));

jest.mock("../src/email/email.queue", () => ({
  EmailQueue: {
    addEmail: jest.fn(),
    addBulkEmails: jest.fn(),
  },
}));

jest.mock("../src/queue/userMetadata.queue", () => ({
  UserMetadataQueue: {
    enqueue: jest.fn(),
  },
}));

jest.mock("../src/queue/userMetadata.worker", () => ({
  UserMetadataWorker: {
    start: jest.fn(),
  },
}));

jest.mock("../src/configs/socket.config", () => ({
  initSocket: jest.fn(),
}));

jest.mock("../src/middleware/rateLimitter", () => ({
  rateLimiterMiddleware: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../src/middleware/authentication", () => ({
  authentication: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../src/middleware/isVerifiedUser", () => ({
  isVerifiedUser: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../src/middleware/isAdmin", () => ({
  isAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../src/utils/redisClient", () => ({
  setCache: jest.fn(asyncNoop),
  getCache: jest.fn(async () => null),
  deleteCache: jest.fn(asyncNoop),
  default: {},
}));

const buildQueryBuilder = () => {
  const chain = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  return chain;
};

const createRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  save: jest.fn(async (data) => data),
  create: jest.fn((data) => ({ ...data })),
  createQueryBuilder: jest.fn(buildQueryBuilder),
  merge: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  delete: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
});

jest.mock("../src/configs/psqlDb.config", () => {
  const repositories = new Map();
  return {
    AppDataSource: {
      initialize: jest.fn(asyncNoop),
      destroy: jest.fn(asyncNoop),
      getRepository: jest.fn((entity: unknown) => {
        if (!repositories.has(entity)) {
          repositories.set(entity, createRepository());
        }
        return repositories.get(entity);
      }),
    },
  };
});

jest.mock("../src/service/base.service", () => {
  class BaseService<T> {
    protected repository: any;
    constructor(_entity: unknown) {
      this.repository = createRepository();
    }
  }
  return { BaseService };
});

jest.mock("uuid", () => ({
  v4: () => "00000000-0000-4000-8000-000000000000",
}));

jest.mock("p-limit", () => {
  return () => {
    return <T>(fn: () => T) => fn();
  };
});

jest.mock("../src/utils/chalk", () => ({
  Logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    warn: jest.fn(),
  },
}));

afterEach(() => {
  jest.clearAllMocks();
});
