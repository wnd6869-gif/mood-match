import {
  PROFILE_PHOTO_MAX_DIMENSION,
  PROFILE_PHOTO_MAX_SIZE_BYTES,
  PROFILE_PHOTO_MAX_SIZE_LABEL,
  PROFILE_PHOTO_MIME_TYPES,
  type ProcessedProfilePhoto,
  type ProfilePhotoMimeType,
} from "@/lib/profile-photo";

export class ImagePreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagePreviewError";
  }
}

function validateImageFile(file: File) {
  if (
    !PROFILE_PHOTO_MIME_TYPES.includes(
      file.type as ProfilePhotoMimeType,
    )
  ) {
    throw new ImagePreviewError(
      "JPEG, PNG, WebP 이미지 파일만 선택할 수 있어요.",
    );
  }

  if (file.size === 0) {
    throw new ImagePreviewError("내용이 없는 이미지 파일이에요.");
  }

  if (file.size > PROFILE_PHOTO_MAX_SIZE_BYTES) {
    throw new ImagePreviewError(
      `이미지 용량이 너무 커요. ${PROFILE_PHOTO_MAX_SIZE_LABEL} 이하의 사진을 선택해주세요.`,
    );
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new ImagePreviewError(
          "이미지를 읽을 수 없어요. 다른 이미지 파일을 선택해주세요.",
        ),
      );
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(
          new ImagePreviewError(
            "이미지를 변환하지 못했어요. 다른 사진을 선택해주세요.",
          ),
        );
      },
      type,
      quality,
    );
  });
}

function renderResizedImage(
  image: HTMLImageElement,
) {
  const scale = Math.min(
    1,
    PROFILE_PHOTO_MAX_DIMENSION /
      Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new ImagePreviewError(
      "이 브라우저에서는 이미지 크기를 조절할 수 없어요.",
    );
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return canvas;
}

export async function processProfilePhoto(
  file: File,
): Promise<ProcessedProfilePhoto> {
  validateImageFile(file);

  const image = await loadImage(file);
  const canvas = renderResizedImage(image);
  const webpBlob = await canvasToBlob(canvas, "image/webp", 0.86);

  if (webpBlob.type !== "image/webp") {
    throw new ImagePreviewError(
      "이 브라우저에서는 WebP 이미지 변환을 지원하지 않아요. 최신 브라우저에서 다시 시도해주세요.",
    );
  }

  if (webpBlob.size > PROFILE_PHOTO_MAX_SIZE_BYTES) {
    throw new ImagePreviewError(
      `변환한 이미지가 ${PROFILE_PHOTO_MAX_SIZE_LABEL}를 초과해요. 다른 사진을 선택해주세요.`,
    );
  }

  return {
    blob: webpBlob,
    contentType: "image/webp",
  };
}
