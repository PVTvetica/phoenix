import apiService from './apiService';
import type { NextcloudFileList, NextcloudStatus, NextcloudUploadResult } from './nextcloudTypes';

export type {
    NextcloudConnectionState,
    NextcloudEnvFlags,
    NextcloudFileEntry,
    NextcloudFileList,
    NextcloudPreviewKind,
    NextcloudStatus,
    NextcloudUploadResult,
} from './nextcloudTypes';

class NextcloudService {
    async getStatus(): Promise<NextcloudStatus> {
        return apiService.getNextcloudStatus();
    }

    async listFiles(path: string = '/'): Promise<NextcloudFileList> {
        return apiService.getNextcloudFiles(path);
    }

    async fetchPreviewBlob(path: string): Promise<Blob> {
        return apiService.getNextcloudPreviewBlob(path);
    }

    async downloadFile(path: string): Promise<Blob> {
        return apiService.downloadNextcloudFile(path);
    }

    async uploadFile(file: File, targetPath: string): Promise<NextcloudUploadResult> {
        return apiService.uploadNextcloudFile(file, targetPath);
    }
}

export const nextcloudService = new NextcloudService();
export default nextcloudService;
