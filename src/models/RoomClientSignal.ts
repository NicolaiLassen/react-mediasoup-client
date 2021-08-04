import {Device} from "mediasoup-client/lib/Device";
import {RtpParameters} from "mediasoup-client/lib/RtpParameters";
import {SctpStreamParameters} from "mediasoup-client/lib/SctpParameters";

export interface NewConsumer {
    method: 'newConsumer'
    peerId: string,
    producerId: string,
    consumerId: string,
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
    dataConsumerId: string,
    sctpStreamParameters: SctpStreamParameters,
    label: string,
    protocol: string,
    appData: any
}

export interface NewPeer {
    method: 'newPeer';
    id: string;
    device: Device;
}

export interface PeerClosed {
    method: 'peerClosed';
    peerId: string;
}

export type RoomClientSignal = NewConsumer
    | NewDataConsumer
    | NewPeer
    | PeerClosed;
