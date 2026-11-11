/** 先完成解码再交给可见图片，避免浏览器先排版空图片、下一帧才绘制内容。 */
export async function createDecodedMemoryPreview(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    if (typeof image.decode === "function") {
      image.src = url;
      await image.decode();
    } else {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("记忆卡图片无法解码"));
        image.src = url;
      });
    }
    return url;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
