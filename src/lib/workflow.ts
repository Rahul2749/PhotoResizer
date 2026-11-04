export type FileKind = "photo" | "signature";

export type JobSummary = {
  status: "empty" | "editing" | "processing" | "adjust" | "ready";
  result: { url: string; width: number; height: number; bytes: number; mime: string; minBytes: number; maxBytes: number } | null;
};

export function downloadName(kind: FileKind, width: number, height: number, mime: string) {
  const extension = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  return `photoresizekaro-${kind}-${width}x${height}.${extension}`;
}
