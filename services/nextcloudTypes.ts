export type NextcloudConnectionState = 'not_configured' | 'active' | 'error';

export interface NextcloudEnvFlags {
    NEXTCLOUD_URL: boolean;
    NEXTCLOUD_USER: boolean;
    NEXTCLOUD_APP_PASSWORD: boolean;
    NEXTCLOUD_BASE_PATH: boolean;
}

export interface NextcloudStatus {
    configured: boolean;
    connection: NextcloudConnectionState;
    basePath: string;
    displayBasePath: string;
    serverUrl?: string;
    env: NextcloudEnvFlags;
    error?: string;
}

export interface NextcloudUploadResult {
    success: true;
    entry: NextcloudFileEntry;
}

export type NextcloudPreviewKind = 'image' | 'pdf' | 'text' | 'none';

export interface NextcloudFileEntry {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modified?: string;
}

export interface NextcloudFileList {
    path: string;
    entries: NextcloudFileEntry[];
}
