import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  getAllowedImageMimeTypes,
  getCloudinarySetupMessage,
  getMaxUploadSizeInBytes,
  isAllowedImageFile,
  isCloudinaryConfigured,
  uploadImageToCloudinary,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

type UploadPurpose = "product" | "category" | "store-logo" | "store-banner";

const allowedPurposes = new Set<UploadPurpose>([
  "product",
  "category",
  "store-logo",
  "store-banner",
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !user.isActive || !user.storeId || user.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error: getCloudinarySetupMessage(),
      },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const fileEntry = formData.get("file");
  const purpose = String(formData.get("purpose") ?? "product");

  if (!(fileEntry instanceof File) || !fileEntry.size) {
    return NextResponse.json(
      { error: "Selecione uma imagem para enviar." },
      { status: 400 },
    );
  }

  if (!allowedPurposes.has(purpose as UploadPurpose)) {
    return NextResponse.json(
      { error: "Tipo de upload inválido." },
      { status: 400 },
    );
  }

  if (!isAllowedImageFile(fileEntry)) {
    return NextResponse.json(
      {
        error: `Formato não suportado. Use ${getAllowedImageMimeTypes()
          .map((type) => type.replace("image/", "").toUpperCase())
          .join(", ")}.`,
      },
      { status: 400 },
    );
  }

  if (fileEntry.size > getMaxUploadSizeInBytes()) {
    return NextResponse.json(
      {
        error: "A imagem excede o limite de 6 MB.",
      },
      { status: 400 },
    );
  }

  try {
    const upload = await uploadImageToCloudinary({
      file: fileEntry,
      storeId: user.storeId,
      purpose: purpose as UploadPurpose,
    });

    return NextResponse.json(upload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar a imagem agora.",
      },
      { status: 500 },
    );
  }
}
