export type SelectedDeviceId = string | null;

export type DeviceTypeContext = {
    devices: DeviceType[];
    selectedDevice: SelectedDeviceId;
    selectDeviceError?: Error | null;
};

export type DeviceType = {
    deviceId: string;
    label: string;
};

export enum Status {
    Loading,
    Succeeded,
    Failed,
    Ended,
}

export enum DeviceNames {
    None,
    Audio,
    Video,
    AudioAndVideo,
}