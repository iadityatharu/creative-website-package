export class YouTubeUtil {
  static extractVideoId(url: string): string | null {
    try {
      if (url.includes("youtube.com/watch?v=")) {
        const urlObj = new URL(url);
        return urlObj.searchParams.get("v");
      }
      if (url.includes("youtu.be/")) {
        return url.split("youtu.be/")[1].split("?")[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  static generateEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  static generateIframe(videoId: string): string {
    return `<iframe width="560" height="315" src="${YouTubeUtil.generateEmbedUrl(
      videoId
    )}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  }
}
