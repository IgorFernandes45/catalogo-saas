import { createHash } from "node:crypto";

import { slugify } from "@/lib/utils";

const defaultCloudinaryFolder = "catalogo-saas";
const maxUploadSizeInBytes = 6 * 1024 * 1024;
const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

type CloudinaryUploadPurpose =
  | "product"
  | "category"
  | "store-logo"
  | "store-banner";

type CloudinaryTransformOptions = {
  width?: number;
  height?: number;
  crop?: "fill" | "limit" | "fit";
  quality?: "auto" | number;
};

function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || "",
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || "",
    baseFolder:
      process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || defaultCloudinaryFolder,
  };
}

export function isCloudinaryConfigured() {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  return Boolean(cloudName && apiKey && apiSecret);
}

export function getCloudinarySetupMessage() {
  return "Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env para ativar os uploads.";
}

export function getAllowedImageMimeTypes() {
  return [...allowedImageMimeTypes];
}

export function getMaxUploadSizeInBytes() {
  return maxUploadSizeInBytes;
}

export function isAllowedImageFile(file: File) {
  return allowedImageMimeTypes.has(file.type);
}

function buildCloudinaryFolder(
  storeId: string,
  purpose: CloudinaryUploadPurpose,
  baseFolder: string,
) {
  const folderByPurpose: Record<CloudinaryUploadPurpose, string> = {
    product: "products",
    category: "categories",
    "store-logo": "store-logo",
    "store-banner": "store-banner",
  };

  return `${baseFolder}/${storeId}/${folderByPurpose[purpose]}`;
}

function buildCloudinaryPublicId(fileName: string) {
  const extensionIndex = fileName.lastIndexOf(".");
  const rawName =
    extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
  const slug = slugify(rawName) || "imagem";

  return `${slug}-${Date.now()}`;
}

function buildCloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const serialized = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${serialized}${apiSecret}`)
    .digest("hex");
}

export async function uploadImageToCloudinary({
  file,
  storeId,
  purpose,
}: {
  file: File;
  storeId: string;
  purpose: CloudinaryUploadPurpose;
}) {
  const { cloudName, apiKey, apiSecret, baseFolder } = getCloudinaryConfig();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(getCloudinarySetupMessage());
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder = buildCloudinaryFolder(storeId, purpose, baseFolder);
  const publicId = buildCloudinaryPublicId(file.name);
  const signature = buildCloudinarySignature(
    {
      folder,
      public_id: publicId,
      timestamp,
    },
    apiSecret,
  );

  const formData = new FormData();
  formData.set("file", file);
  formData.set("folder", folder);
  formData.set("public_id", publicId);
  formData.set("timestamp", timestamp);
  formData.set("api_key", apiKey);
  formData.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    width?: number;
    height?: number;
    error?: {
      message?: string;
    };
  };

  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(
      payload.error?.message || "Nao foi possivel enviar a imagem para o Cloudinary.",
    );
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id,
    width: payload.width || 0,
    height: payload.height || 0,
  };
}

function isCloudinaryUrl(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl);
    return (
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.includes("/image/upload/")
    );
  } catch {
    return false;
  }
}

function applyCloudinaryTransformations(
  imageUrl: string,
  options: CloudinaryTransformOptions,
) {
  if (!isCloudinaryUrl(imageUrl)) {
    return imageUrl;
  }

  const params = [
    "f_auto",
    "dpr_auto",
    `q_${options.quality ?? "auto"}`,
    options.crop ? `c_${options.crop}` : null,
    options.width ? `w_${options.width}` : null,
    options.height ? `h_${options.height}` : null,
  ].filter(Boolean);

  if (!params.length) {
    return imageUrl;
  }

  return imageUrl.replace("/image/upload/", `/image/upload/${params.join(",")}/`);
}

export function optimizeCloudinaryImage(
  imageUrl: string,
  options: CloudinaryTransformOptions = {},
) {
  return applyCloudinaryTransformations(imageUrl, options);
}
