export type MutationActionResult = {
  status: "idle" | "success" | "error";
  message: string;
  resetToken: number;
};

export type ProductFormActionResult = MutationActionResult;
