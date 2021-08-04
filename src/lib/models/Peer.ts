import {Producer} from "mediasoup-client/lib/Producer";
import {Device} from "mediasoup-client";

export interface Peer {
    id: string;
    device: Device;
    consumers: any[]; // TODO
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
