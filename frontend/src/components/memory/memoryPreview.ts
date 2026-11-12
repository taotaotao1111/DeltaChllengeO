/** 内嵌 PNG 的字节跟着图片地址走，不依赖 WebView 的 blob 地址注册表。 */
function readInlineImage(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && reader.result.startsWith("data:image/")
      ? resolve(reader.result) : reject(new Error("记忆卡图片数据无效"));
    reader.onerror = () => reject(reader.error ?? new Error("记忆卡图片读取失败"));
    reader.onabort = () => reject(new Error("记忆卡图片读取已取消"));
    reader.readAsDataURL(blob);
  });
}

export function releaseMemoryPreview(url: string): void {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

/** 手机使用内嵌 PNG 兼容原生长按保存；PC 保留轻量 blob。两者都先解码再展示。 */
export async function createDecodedMemoryPreview(blob: Blob, inline = false): Promise<string> {
  const url = inline ? await readInlineImage(blob) : URL.createObjectURL(blob);
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
    releaseMemoryPreview(url);
    throw error;
  }
}
