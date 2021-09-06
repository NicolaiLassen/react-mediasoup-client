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

export type RoomSignal = NewConsumer
    | NewDataConsumer
    | NewPeer
    | PeerClosed;

interface RoomSignalMethodNames {
    readonly getRouterRtpCapabilities: 'getRouterRtpCapabilities';
    readonly join: 'join';
    readonly createWebRtcTransport: 'createWebRtcTransport';
    readonly connectWebRtcTransport: 'connectWebRtcTransport';
    readonly restartIce: 'restartIce';
    readonly produce: 'produce';
    readonly closeProducer: 'closeProducer';
    readonly pauseProducer: 'pauseProducer';
    readonly resumeProducer: 'resumeProducer';
    readonly closeConsumer: 'closeConsumer';
    readonly pauseConsumer: 'pauseConsumer';
    readonly resumeConsumer: 'resumeConsumer';
    readonly setConsumerPreferredLayers: 'setConsumerPreferredLayers';
    readonly setConsumerPriority: 'setConsumerPriority';
    readonly requestConsumerKeyFrame: 'requestConsumerKeyFrame';
    readonly produceData: 'produceData';
}

export const roomSignalMethods: RoomSignalMethodNames = {
    getRouterRtpCapabilities: 'getRouterRtpCapabilities',
    join: 'join',
    createWebRtcTransport: 'createWebRtcTransport',
    connectWebRtcTransport: 'connectWebRtcTransport',
    restartIce: 'restartIce',
    produce: 'produce',
    closeProducer: 'closeProducer',
    pauseProducer: 'pauseProducer',
    resumeProducer: 'resumeProducer',
    closeConsumer: 'closeConsumer',
    pauseConsumer: 'pauseConsumer',
    resumeConsumer: 'resumeConsumer',
    setConsumerPreferredLayers: 'setConsumerPreferredLayers',
    setConsumerPriority: 'setConsumerPriority',
    requestConsumerKeyFrame: 'requestConsumerKeyFrame',
    produceData: 'produceData'
};