export const useLocalVideo = async ():
    Promise<Map<string, MediaDeviceInfo> | null> => {

    const webcams = new Map();
    const devices: MediaDeviceInfo[] = await navigator.mediaDevices.enumerateDevices();

    for (const device of devices) {
        if (device.kind !== 'videoinput')
            continue;
        webcams.set(device.deviceId, device);
    }

    return webcams;
}

export default useLocalVideo;