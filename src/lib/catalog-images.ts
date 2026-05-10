import { optimizeCloudinaryImage } from "@/lib/cloudinary";

const fallbackCatalogImage =
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80";

const brokenImageFragments = [
  "photo-1506629905607-d9b1f4ed13b8",
  "photo-1599733589046-8336c4dcb3f5",
  "photo-1631214540242-6f0e5977f0ee",
];

const allowedImageHosts = ["images.unsplash.com", "res.cloudinary.com"];

type ResolveCatalogImageOptions = {
  width?: number;
  height?: number;
  crop?: "fill" | "limit" | "fit";
};

function normalizeImageList(images: Array<string | null | undefined>) {
  const seen = new Set<string>();

  return images
    .map((image) => image?.trim() || "")
    .filter(Boolean)
    .filter((image) => {
      if (seen.has(image)) {
        return false;
      }

      seen.add(image);
      return true;
    });
}

export function isCatalogImageUrlAllowed(imageUrl?: string | null) {
  if (!imageUrl?.trim()) {
    return true;
  }

  try {
    const parsed = new URL(imageUrl);

    return parsed.protocol === "https:" && allowedImageHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function resolveCatalogImage(
  imageUrl?: string | null,
  options: ResolveCatalogImageOptions = {},
) {
  const sourceUrl = imageUrl || fallbackCatalogImage;

  const isKnownBroken = brokenImageFragments.some((fragment) =>
    sourceUrl.includes(fragment),
  );

  const safeUrl =
    isKnownBroken || !isCatalogImageUrlAllowed(sourceUrl)
      ? fallbackCatalogImage
      : sourceUrl;

  return optimizeCloudinaryImage(safeUrl, {
    width: options.width,
    height: options.height,
    crop: options.crop,
  });
}

export function parseGalleryImages(galleryJson?: string | null) {
  if (!galleryJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(galleryJson);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeImageList(parsed);
  } catch {
    return [];
  }
}

export function buildProductImageGallery(
  imageUrl?: string | null,
  gallery: Array<string | null | undefined> = [],
  options: ResolveCatalogImageOptions = {},
) {
  return normalizeImageList([imageUrl, ...gallery]).map((image) =>
    resolveCatalogImage(image, options),
  );
}
