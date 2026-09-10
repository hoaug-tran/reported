import { convertImageToWebP } from "./imageOptimizer";

export interface UploadAttachmentResult {
  id: string;
  originalName: string;
  filename: string;
  url: string;
  inlineUrl: string;
  sizeBytes: number;
  mimeType: string;
  isVoiceNote?: boolean;
}

interface UploadOptions {
  targetType?: string;
  targetId?: string;
  onProgress?: (progressPercent: number) => void;
}

const CHUNK_SIZE = 2 * 1024 * 1024;

export async function uploadFileWithChunking(
  file: File | Blob,
  fileName: string,
  options: UploadOptions = {},
): Promise<UploadAttachmentResult> {
  let processedFile = file;
  let processedName = fileName;
  if (file instanceof File && file.type.startsWith("image/")) {
    processedFile = await convertImageToWebP(file);
    processedName = (processedFile as File).name || fileName;
  }

  const token = localStorage.getItem("reported_token");
  const activeWorkspaceId = localStorage.getItem(
    "reported_active_workspace_id",
  );

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (activeWorkspaceId) {
    headers["x-workspace-id"] = activeWorkspaceId;
  }

  const fileSize = processedFile.size;

  if (fileSize <= CHUNK_SIZE) {
    const formData = new FormData();
    formData.append("file", processedFile, processedName);
    if (options.targetType) formData.append("targetType", options.targetType);
    if (options.targetId) formData.append("targetId", options.targetId);

    const res = await fetch("/api/v1/attachments", {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(err.message || "Upload failed");
    }

    if (options.onProgress) options.onProgress(100);
    return res.json();
  }

  const uploadId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  let finalResult: UploadAttachmentResult | null = null;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    const chunkBlob = file.slice(start, end);

    const formData = new FormData();
    formData.append("chunk", chunkBlob, `chunk_${i}`);
    formData.append("uploadId", uploadId);
    formData.append("chunkIndex", String(i));
    formData.append("totalChunks", String(totalChunks));
    formData.append("filename", fileName);
    formData.append("mimeType", file.type || "application/octet-stream");
    if (options.targetType) formData.append("targetType", options.targetType);
    if (options.targetId) formData.append("targetId", options.targetId);

    const res = await fetch("/api/v1/attachments/chunk", {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Chunk upload failed" }));
      throw new Error(err.message || `Chunk ${i} failed`);
    }

    const data = await res.json();
    if (options.onProgress) {
      options.onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    if (i === totalChunks - 1) {
      finalResult = data;
    }
  }

  if (!finalResult) {
    throw new Error("Upload assembly failed");
  }

  return finalResult;
}
