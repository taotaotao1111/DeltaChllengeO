type StoryVideoPort = Pick<HTMLVideoElement, "muted" | "defaultMuted" | "volume" | "play">;

/** 同一文物内按视频素材记录，切换故事问题不重复展示封面。 */
export const storyVideoCompletionKey = (src: string) => `video:completed:${src}`;

/** 必须从用户点击的同步挂载或重试按钮调用；拒绝时交由界面提示重试，不降级为静音。 */
export function playStoryVideo(video: StoryVideoPort): Promise<void> {
  video.defaultMuted = false;
  video.muted = false;
  video.volume = 1;
  return video.play();
}
