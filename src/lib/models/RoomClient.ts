import {EventsMap} from "socket.io-client/build/typed-events";
import {BuiltinHandlerName} from "mediasoup-client/lib/Device";
import {RtpParameters} from "mediasoup-client/lib/RtpParameters";
import {SctpStreamParameters} from "mediasoup-client/lib/SctpParameters";

export interface RoomEventsMap extends EventsMap {
    request: (req: Request) => void
    response: (res: Response) => void;
    close: () => void
    speaker: (req: ActiveSpeakerResponse) => void;
    stream: () => void;
    state: (state: string) => void;
}

// qvga:  320 × 240 , vga: 640 x 480, hd: 1280x720
export type Resolution = 'qvga' | 'vga' | 'hd';

export interface DeviceStream {
    device?: MediaDeviceInfo;
    resolution: Resolution;
}

export interface MeState {

}

export interface RoomClientConfig {
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

export interface ActiveSpeakerResponse {
    peerId: string,
    volume: number
}

export interface RoomClientNotification {
    method: string
}

export interface NewConsumer {
    method: 'newConsumer'
    peerId: string,
    producerId: string,
    id: string,
    kind?: 'audio' | 'video';
    rtpParameters: RtpParameters,
    type: string,
    appData: any,
    producerPaused: boolean
}

export interface NewDataConsumer {
    method: 'newDataConsumer',
    peerId: string,
    dataProducerId: string,
    id: string,
    sctpStreamParameters: SctpStreamParameters,
    label: string,
    protocol: string,
    appData: any
}

export interface NewPeer {
    method: 'newPeer',
}

export type RoomClientSignal = NewConsumer
    | NewDataConsumer
    | NewPeer;

