import {Producer} from "mediasoup-client/lib/Producer";
import {Device} from "mediasoup-client";
import {RtpParameters} from "mediasoup-client/lib/RtpParameters";

export interface PeerConsumer {
    id: string,
    type: string,
    locallyPaused: boolean,
    remotelyPaused: boolean,
    rtpParameters: RtpParameters,
    spatialLayers: number,
    temporalLayers: number,
    preferredSpatialLayer: number,
    preferredTemporalLayer: number,
    priority: number,
    codec: string,
    track: MediaStreamTrack
}

export interface Peer {
    id: string;
    device: Device;
    consumers: PeerConsumer[];
    dataConsumers: Producer[];
}

export interface PeerEvent {
    readonly disconnect: 'disconnect';
    readonly close: 'close';
    readonly signal: 'signal';
    readonly notification: 'notification';
    readonly downlinkBwe: 'downlinkBwe';
}

export const peerEventNames: PeerEvent = {
    disconnect: 'disconnect',
    close: 'close',
    signal: 'signal',
    notification: 'notification',
    downlinkBwe: 'downlinkBwe'
};
