export interface FileUpload {
  fileUrl: string;
  type: string;
}
export type FileUploadMap = Record<string, FileUpload[]>;
