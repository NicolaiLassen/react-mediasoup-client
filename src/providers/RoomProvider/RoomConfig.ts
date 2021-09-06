import {BuiltinHandlerName} from "mediasoup-client/lib/Device";
import {uuidv4} from "../../utils/webRTCUtil";

// qvga:  320 × 240 , vga: 640 x 480, hd: 1280x720
export type Resolution = 'qvga' | 'vga' | 'hd';

export interface DeviceStream {
    device?: MediaDeviceInfo;
    resolution: Resolution;
}

export interface RoomConfig {
    produce: boolean;
    muted: boolean;
    consume: boolean;
    datachannel: string;
    useDataChannel: boolean;
    displayName: string;
    svc: boolean;
    forceTcp: boolean;
    forceH264: boolean;
    forceVP9: boolean;
    useSharingSimulcast: boolean;
    useSimulcast: boolean;
    resolution: Resolution;
    reconnectionTimeout: number;
    webcamOnly: boolean;
    audioOnly: boolean;
    token?: string;
    handlerName?: BuiltinHandlerName;
    webRTConfig?: RTCConfiguration
}