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