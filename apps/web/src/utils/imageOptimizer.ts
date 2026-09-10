export interface ImageOptimizeOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export async function convertImageToWebP(
  file: File,
  options: ImageOptimizeOptions = {},
): Promise<File> {
  const { quality = 0.82, maxWidth = 1920, maxHeight = 1920 } = options;

  if (!file.type.startsWith("image/")) {
    return file;
  }

  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  if (file.type === "image/webp" && file.size < 500 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }

            const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
            const webpFile = new File([blob], newName, {
              type: "image/webp",
              lastModified: Date.now(),
            });

            if (webpFile.size < file.size) {
              resolve(webpFile);
            } else {
              resolve(file);
            }
          },
          "image/webp",
          quality,
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function compressAvatarToWebP(file: File): Promise<File> {
  return convertImageToWebP(file, {
    quality: 0.85,
    maxWidth: 512,
    maxHeight: 512,
  });
}
