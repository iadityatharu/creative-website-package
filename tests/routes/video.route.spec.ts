import request from "supertest";
import { buildTestApp } from "../utils/testApp";
import { Video as VideoService } from "../../src/service/video/video.service";
import { StatusCode } from "../../src/constant/statusCode.interface";

describe("Video Routes", () => {
  const app = buildTestApp();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a video", async () => {
    jest
      .spyOn(VideoService.prototype, "createVideo")
      .mockResolvedValue({ status: StatusCode.CREATED });

    const res = await request(app)
      .post("/api/v1/creative/video/create-video")
      .send({
        title: "Intro Video",
        youtubeVideoId: "abcd1234",
        productModelNumber: "MX-100",
        productId: "prod-1",
      });

    expect(res.status).toBe(StatusCode.CREATED);
    expect(res.body.message).toBe("Created");
  });

  it("lists videos", async () => {
    jest.spyOn(VideoService.prototype, "getAllVideos").mockResolvedValue({
      status: StatusCode.OK,
      data: {
        videos: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    });

    const res = await request(app).get("/api/v1/creative/video/get-all-videos");
    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.data).toHaveProperty("videos");
  });

  it("gets a video by identifier", async () => {
    const video: any = { id: "vid-1", title: "Intro Video" };

    jest
      .spyOn(VideoService.prototype, "getVideoById")
      .mockResolvedValue({ status: StatusCode.OK, video });

    const res = await request(app).get(
      "/api/v1/creative/video/get-video/vid-1"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.video).toEqual(video);
  });

  it("updates a video", async () => {
    jest
      .spyOn(VideoService.prototype, "updateVideo")
      .mockResolvedValue({ status: StatusCode.OK });

    const res = await request(app)
      .put("/api/v1/creative/video/update-video/vid-1")
      .send({ title: "Updated Title" });

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.message).toBe("Updated");
  });

  it("deletes a video", async () => {
    jest
      .spyOn(VideoService.prototype, "deleteVideo")
      .mockResolvedValue({
        status: StatusCode.OK,
        deletedVideoIds: ["vid-1"],
      });

    const res = await request(app).delete(
      "/api/v1/creative/video/delete-video/vid-1"
    );

    expect(res.status).toBe(StatusCode.OK);
    expect(res.body.deletedVideoIds).toContain("vid-1");
  });
});
