// WebHID API type declarations
// https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API

interface HIDDevice extends EventTarget {
    readonly opened: boolean;
    readonly vendorId: number;
    readonly productId: number;
    readonly productName: string;
    readonly collections: HIDCollectionInfo[];
    open(): Promise<void>;
    close(): Promise<void>;
    sendReport(reportId: number, data: BufferSource): Promise<void>;
    sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
    receiveFeatureReport(reportId: number): Promise<DataView>;
    addEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void;
    removeEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void;
}

interface HIDInputReportEvent extends Event {
    readonly device: HIDDevice;
    readonly reportId: number;
    readonly data: DataView;
}

interface HIDConnectionEvent extends Event {
    readonly device: HIDDevice;
}

interface HIDCollectionInfo {
    usagePage: number;
    usage: number;
    type: number;
    children: HIDCollectionInfo[];
    inputReports: HIDReportInfo[];
    outputReports: HIDReportInfo[];
    featureReports: HIDReportInfo[];
}

interface HIDReportInfo {
    reportId: number;
    items: HIDReportItem[];
}

interface HIDReportItem {
    isAbsolute: boolean;
    isArray: boolean;
    isRange: boolean;
    hasNull: boolean;
    usages: number[];
    usageMinimum: number;
    usageMaximum: number;
    reportSize: number;
    reportCount: number;
    logicalMinimum: number;
    logicalMaximum: number;
}

interface HIDDeviceFilter {
    vendorId?: number;
    productId?: number;
    usagePage?: number;
    usage?: number;
}

interface HIDDeviceRequestOptions {
    filters: HIDDeviceFilter[];
}

interface HID extends EventTarget {
    getDevices(): Promise<HIDDevice[]>;
    requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>;
    addEventListener(type: 'connect' | 'disconnect', listener: (event: HIDConnectionEvent) => void): void;
    removeEventListener(type: 'connect' | 'disconnect', listener: (event: HIDConnectionEvent) => void): void;
}

interface Navigator {
    readonly hid: HID;
}
