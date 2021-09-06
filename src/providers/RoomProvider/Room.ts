import * as mediasoupClient from 'mediasoup-client';
import {detectDevice, Device, types} from 'mediasoup-client';
import {StrictEventEmitter} from 'strict-event-emitter';
import {Consumer} from "mediasoup-client/lib/Consumer";
import {BuiltinHandlerName} from "mediasoup-client/lib/Device";
import {RtpCapabilities} from "mediasoup-client/lib/RtpParameters";
import {TransportOptions} from "mediasoup-client/lib/Transport";
import {Producer} from "mediasoup-client/lib/Producer";
import {DataConsumer} from "mediasoup-client/lib/DataConsumer";
import {DeviceStream, Resolution, RoomConfig} from "./RoomConfig";
import {Peer, peerEventNames} from "./Peer";
import {ProducerSoundBrowserForce, uuidv4} from "../../utils/webRTCUtil";
import {RoomSignal, roomSignalMethods} from "./RoomSignal";
import {
    PC_PROPRIETARY_CONSTRAINTS,
    VIDEO_CONSTRAINS,
    WEBCAM_KSVC_ENCODINGS,
    WEBCAM_SIMULCAST_ENCODINGS
} from "../../constants/videoConfig";
import {getDevices} from "../../utils/cookieStore";
import {createPromiseSocket, PromiseSocket} from "../../utils/promiseSocket";
import {RoomEventMap} from "./RoomEventMap";
import {ActiveSpeaker, RoomNotification} from "./RoomNotification";
import {ROOM_CONFIG_DEFAULT} from "../../constants/roomConfig";


class Room extends StrictEventEmitter<RoomEventMap> {

    readonly roomId: string;
    readonly peerId: string;
    readonly url: string;
    readonly path: string;

    private socket?: PromiseSocket;
    private sendTransport: types.Transport | null = null;
    private recvTransport: types.Transport | null = null;
    private readonly webcam: DeviceStream;
    private webcams = new Map<string, MediaDeviceInfo>();

    private mediasoupDevice?: Device;
    private displayName?: string

    peers: Map<string, Peer> = new Map()

    private muted;
    private joined = false;
    private closed = false;
    private externalVideo = false;

    private producers: Map<string, Producer> = new Map()
    private consumers: Map<string, Consumer> = new Map();
    private dataConsumers = new Map<string, DataConsumer>();
    private readonly handlerName?: BuiltinHandlerName;

    webcamProducer?: Producer;
    webcamLoading = false;

    audioProducer?: Producer;
    audioLoading = false;

    private shareProducer? = Producer;
    shareProducerLoading = false;

    private activeSpeakerId?: string;

    // CONFIGS
    private mediaCapabilities: any;

    private audioOnly = false;
    private webcamOnly = false
    private useDataChannel: boolean;
    private produce: boolean;
    private consume: boolean;
    private svc: boolean;
    private forceH264: boolean;
    private forceTcp: boolean;
    private forceVP9: boolean;
    private useSharingSimulcast: boolean;
    private useSimulcast: boolean;
    private reconnectionTimeout: number;

    private readonly token?: string;

    constructor(url: string,
                roomId: string,
                peerId?: string,
                config?: Partial<RoomConfig>,
                path = 'server',
    ) {
        super();
        const defaultConfig: RoomConfig = {
            ...ROOM_CONFIG_DEFAULT,
            ...config
        }

        this.url = url;
        this.roomId = roomId;
        this.peerId = peerId ?? uuidv4();
        this.path = path;

        this.displayName = defaultConfig.displayName;
        this.handlerName = defaultConfig.handlerName
            ? defaultConfig.handlerName
            : detectDevice();

        this.webcam = {
            resolution: defaultConfig.resolution
        }

        this.webcamOnly = defaultConfig.webcamOnly;
        this.audioOnly = defaultConfig.audioOnly;
        this.muted = defaultConfig.muted;
        this.useDataChannel = defaultConfig.useDataChannel;
        this.produce = defaultConfig.produce;
        this.consume = defaultConfig.consume;
        this.token = defaultConfig.token;
        this.svc = defaultConfig.svc;
        this.forceTcp = defaultConfig.forceTcp;
        this.forceH264 = defaultConfig.forceH264;
        this.forceVP9 = defaultConfig.forceVP9;
        this.useSharingSimulcast = defaultConfig.useSharingSimulcast;
        this.useSimulcast = defaultConfig.useSimulcast;
        this.reconnectionTimeout = defaultConfig.reconnectionTimeout;
    }

    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.socket?.close();
        this.sendTransport?.close();
        this.recvTransport?.close();
        this.emit('close');
    }

    async join() {

        if (this.closed) {
            this.closed = false;
        }

        if (this.joined) {
            this.emit('resetJoin')
            this.joined = false;
        }

        this.socket = createPromiseSocket(this.url, {
            reconnectionDelayMax: this.reconnectionTimeout,
            query: {
                'peerId': this.peerId,
                'roomId': this.roomId
            },
            auth: {
                token: this.token
            },
            path: '/' + this.path,
            transports: ['websocket']
        });

        this.socket.on('connect', async () => {
            console.debug('socket.io.on.connect');
            this.emit('state', 'connect');
            await this.enterRoom();
        });

        this.socket.on('connect_error', async (err: any) => {
            console.debug('socket.io.on.connect_error');
            this.emit('socket_error', err)
            this.emit('state', 'err');
            this.close()
        });

        this.socket.on('disconnect', async (reason: any) => {
            console.debug('socket.io.on.disconnect');
            this.joined = false;
            this.sendTransport?.close()
            this.sendTransport = null;
            this.recvTransport?.close()
            this.recvTransport = null;
            this.emit('socket_disconnect', reason);
        });

        this.socket.on('signal', (res: RoomSignal) => {
            console.debug('socket.io.on.signal');
            this.handleSignal(res);
        });

        this.socket.on('notification', (res: RoomNotification) => {
            console.debug('socket.io.on.notification');
            this.handleNotification(res);
        });
    }

    async changeWebcamResolution(resolution: Resolution) {
        this.webcam.resolution = resolution
        if (!this.webcam?.device) {
            this.emit('error', {
                type: 'device',
                severity: 'warning',
                message: 'No device found'
            })
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: {exact: this.webcam.device.deviceId},
                    ...VIDEO_CONSTRAINS[this.webcam.resolution]
                }
            });
            const track = stream.getVideoTracks()[0];
            if (!this.webcamProducer) {
                throw Error("Start webcamProducer");
            }

            await this.webcamProducer.replaceTrack({track});
        } catch (error) {
            console.log(error)
        }
    }

    async restartIce() {

    }

    async enableWebcam() {

        if (this.webcamProducer)
            return;
        if (!this.mediasoupDevice) {
            this.emit("device")
            return
        }

        if (!this.mediasoupDevice.canProduce('video')) {
            this.emit('device');
            return;
        }

        let track;
        let device;
        this.webcamLoading = true;

        try {
            if (!this.externalVideo) {
                await this.updateWebcams();
                device = this.webcam.device;

                const {resolution} = this.webcam;
                if (!device)
                    // TODO EMIT
                    throw new Error('no webcam devices');

                const stream = await navigator.mediaDevices.getUserMedia({
                    video:
                        {
                            deviceId: {ideal: device.deviceId},
                            ...VIDEO_CONSTRAINS[resolution]
                        }
                });
                track = stream.getVideoTracks()[0];
            } else {
                const stream = new MediaStream();
                track = stream.getVideoTracks()[0].clone();
            }

            let encodings;
            let codec;
            const codecOptions = {videoGoogleStartBitrate: 1000};

            const codecs = this.mediasoupDevice.rtpCapabilities.codecs;
            if (!codecs) {
                return
            }

            if (this.forceH264) {
                codec = codecs.find((c) => c.mimeType.toLowerCase() === 'video/h264');
                if (!codec) {
                    this.emit("")
                }
            }

            if (this.forceVP9) {
                codec = codecs.find((c) => c.mimeType.toLowerCase() === 'video/vp9');
                if (!codec) {
                    this.emit("")
                }
            }

            if (this.useSimulcast) {
                const firstVideoCodec = codecs.find((c) => c.kind === 'video');
                if (!firstVideoCodec) {
                    return;
                }
                if ((this.forceVP9 && codec) ||
                    firstVideoCodec.mimeType.toLowerCase() === 'video/vp9'
                ) {
                    encodings = WEBCAM_KSVC_ENCODINGS;
                } else {
                    encodings = WEBCAM_SIMULCAST_ENCODINGS;
                }
            }

            this.webcamProducer =
                await this.sendTransport?.produce({
                    track,
                    encodings,
                    codecOptions,
                    codec
                });

            console.debug("webcam", this.webcamProducer)

            if (!this.webcamProducer) {
                return
            }

            this.webcamProducer.on('transportclose', () => {
                console.log('transportclose')
                this.webcamProducer = undefined;
            });

            this.webcamProducer.on('trackended', () => {
                console.log('trackended')
                this.disableVideo();
            });

            this.producers.set(this.webcamProducer.id, this.webcamProducer)

            // TODO: local stream
            this.emit('localStream', track)

        } catch (error) {
            console.error('_joinRoom() failed:%o', error);

            if (track)
                track.stop();

            // TODO
            this.emit('localStream', error)
        }
    }

    async disableVideo() {

    }

    async enableMic() {
        if (this.audioProducer)
            // EMIT ERROR
            return;

        if (!this.mediasoupDevice?.canProduce('audio')) {
            // EMIT ERROR
            return;
        }

        let track;
        try {
            if (!this.externalVideo) {
                const stream = await navigator.mediaDevices.getUserMedia({audio: true});
                track = stream.getAudioTracks()[0];
            } else {
                const stream = new MediaStream();
                track = stream.getAudioTracks()[0].clone();
            }

            if (!this.sendTransport) {
                console.log("!this.sendTransport")
                return
            }
            const producer =
                await this.sendTransport.produce({
                    track,
                    codecOptions: {
                        opusStereo: true,
                        opusDtx: true
                    }
                });

            this.producers.set(producer.id, producer)

            producer.on('transportclose', (error) => {
                console.log(error)
                console.log("transportclose")
                this.audioProducer = undefined;
            });

            producer.on('trackended', (error: any) => {
                console.log(error)
                console.log('trackended')
                this.emit('producer',
                    {
                        type: 'warning',
                        message: 'Microphone disconnected!'
                    }
                );
                this.disableMic();
            });
        } catch (error) {
            console.error(error);
            this.emit('producer',
                {
                    type: 'error',
                    message: `Error starting microphone: ${error}`
                }
            );

            if (track)
                track.stop();
        }
    }

    async disableMic() {
    }

    private async updateWebcams() {
        this.webcams = new Map();
        const devices = await navigator.mediaDevices.enumerateDevices();

        for (const device of devices) {
            if (device.kind !== 'videoinput')
                continue;
            this.webcams.set(device.deviceId, device);
        }

        const array = Array.from(this.webcams.values());
        const len = array.length;
        const currentWebcamId =
            this.webcam.device ? this.webcam.device.deviceId : '';

        if (len === 0) {
            this.webcam.device = undefined;
        } else if (!this.webcams.has(currentWebcamId)) {
            this.webcam.device = array[0];
        }

        // EMIT UPDATE
        this.emit('');
    }

    private async handleSignal(signal: RoomSignal) {
        switch (signal.method) {
            case 'newPeer': {
                const peer = signal;
                console.log('newPeer', peer)

                this.peers.set(peer.id, {
                    id: peer.id,
                    device: peer.device,
                    consumers: [],
                    dataConsumers: []
                });

                this.emit('newPeer', peer);
                break;
            }
            case 'peerClosed': {
                console.log('peerClosed')
                const {peerId} = signal;
                this.peers.delete(peerId);
                this.emit('peerClosed', peerId)
                break;
            }
            case 'newConsumer': {

                if (!this.consume) {
                    this.emit('reject')
                    console.log('newConsumer')
                    // reject(403, 'I do not want to consume');
                    break;
                }

                const {
                    peerId,
                    producerId,
                    consumerId,
                    kind,
                    rtpParameters,
                    type,
                    appData,
                    producerPaused
                } = signal;

                try {
                    if (!this.recvTransport)
                        return

                    const consumer = await this.recvTransport.consume(
                        {
                            id: consumerId,
                            producerId,
                            kind,
                            rtpParameters,
                            appData: {...appData, peerId} // Trick.
                        });

                    // TODO
                    const {spatialLayers, temporalLayers} =
                        mediasoupClient.parseScalabilityMode(
                            // @ts-ignore
                            consumer.rtpParameters.encodings[0].scalabilityMode);

                    this.consumers.set(consumer.id, consumer);

                    const peer = this.peers.get(peerId);

                    if (!peer) {
                        // TODO ERROR
                        console.log(peer)
                        return
                    }

                    peer.consumers = [...peer.consumers, {
                        id: consumer.id,
                        type: type,
                        locallyPaused: false,
                        remotelyPaused: producerPaused,
                        rtpParameters: consumer.rtpParameters,
                        spatialLayers: spatialLayers,
                        temporalLayers: temporalLayers,
                        preferredSpatialLayer: spatialLayers - 1,
                        preferredTemporalLayer: temporalLayers - 1,
                        priority: 1,
                        codec: consumer.rtpParameters.codecs[0].mimeType.split('/')[1],
                        track: consumer.track
                    }]

                    this.peers.set(peerId, peer)

                    // TODO
                    this.emit('peer', peer);

                    consumer.on('transportclose', () => {
                        console.log('transportclose')
                        this.emit('transport')
                        this.consumers.delete(consumer.id);
                    });

                    // If audio-only mode is enabled, pause it.
                    if (consumer.kind === 'video' && this.audioOnly)
                        this.pauseConsumer(consumer);
                } catch (error) {

                    this.emit('consumer', {
                        type: 'error'
                    });

                    throw error;
                }

                break;
            }

            case 'newDataConsumer': {
                console.log('newDataConsumer')

                if (!this.consume) {
                    break;
                }

                if (!this.useDataChannel) {
                    break;
                }

                const {
                    peerId,
                    dataProducerId,
                    dataConsumerId,
                    sctpStreamParameters,
                    label,
                    protocol,
                    appData
                } = signal;

                try {
                    const dataConsumer = await this.recvTransport?.consumeData(
                        {
                            id: dataConsumerId,
                            dataProducerId,
                            sctpStreamParameters,
                            label,
                            protocol,
                            appData: {...appData, peerId}
                        });

                    if (!dataConsumer) {
                        return
                    }

                    // TODO EMIT ERROR MAP
                    this.dataConsumers.set(dataConsumer.id, dataConsumer);

                    dataConsumer.on('transportclose', () => {
                        this.dataConsumers.delete(dataConsumer.id);
                    });

                    dataConsumer.on('open', () => {
                        this.emit('dataConsumer');
                    });

                    dataConsumer.on('close', () => {
                        this.dataConsumers.delete(dataConsumer.id);
                        this.emit('dataConsumer')
                    });

                    dataConsumer.on('error', (error) => {
                        this.emit('dataConsumer')
                    });

                    dataConsumer.on('message', (message) => {
                        console.log(message)
                    });

                } catch (error) {
                    console.log(error)
                    throw error;
                }
                break;
            }
        }
    }

    private handleNotification(notification: RoomNotification) {
        switch (notification.method) {
            case "activeSpeaker":
                this.activeSpeakerId = notification.peerId;
                this.emit('activeSpeaker', {peerId: notification, volume: notification.volume});
        }
    }

    private pauseConsumer(consumer: Consumer) {

    }

    private async enterRoom() {

        if (!this.socket) {
            this.emit('error', {
                type: 'socket',
                severity: 'warning',
                message: 'Socket not connected'
            })
            return
        }

        try {
            this.mediasoupDevice = new Device({handlerName: this.handlerName});
            const routerRtpCapabilities = await this.socket.emitAsync<RtpCapabilities>(peerEventNames.signal,
                {
                    method: 'getRouterRtpCapabilities'
                });

            await this.mediasoupDevice.load({routerRtpCapabilities});
            await ProducerSoundBrowserForce()

            if (this.produce) {
                const transportOptions = await this.socket.emitAsync<TransportOptions>(peerEventNames.signal,
                    {
                        method: roomSignalMethods.createWebRtcTransport,
                        forceTcp: this.forceTcp,
                        producing: true,
                        consuming: false,
                        sctpCapabilities: this.useDataChannel ?
                            this.mediasoupDevice.sctpCapabilities : undefined
                    });

                this.sendTransport = this.mediasoupDevice.createSendTransport({
                    ...transportOptions,
                    proprietaryConstraints: PC_PROPRIETARY_CONSTRAINTS,
                });

                this.sendTransport.on('connect', (
                    {dtlsParameters}, callback, errback) => {
                    console.log('sendTransport.on.connect', this.sendTransport?.id)
                    this.socket?.emitAsync(peerEventNames.signal, {
                        method: roomSignalMethods.connectWebRtcTransport,
                        transportId: this.sendTransport?.id,
                        dtlsParameters
                    }).then(callback).catch(errback);
                });

                this.sendTransport.on('produce', async (
                    {kind, rtpParameters, appData}, callback, errback) => {
                    console.log('sendTransport.on.produce', this.sendTransport?.id)
                    this.socket?.emitAsync(peerEventNames.signal, {
                        method: roomSignalMethods.produce,
                        transportId: this.sendTransport?.id,
                        kind,
                        rtpParameters,
                        appData
                    }).then(callback).catch(errback);
                });

                this.sendTransport.on('producedata', async (
                    {
                        sctpStreamParameters,
                        label,
                        protocol,
                        appData
                    },
                    callback,
                    errback
                ) => {
                    this.socket?.emitAsync(peerEventNames.signal, {
                        method: roomSignalMethods.produceData,
                        transportId: this.sendTransport?.id,
                        sctpStreamParameters,
                        label,
                        protocol,
                        appData
                    }).then(callback).catch(errback);
                });

                this.sendTransport.on('connectionstatechange', (connectionState) => {
                    console.log('connectionstatechange', connectionState)
                });
            }

            if (this.consume) {
                const transportInfo =
                    await this.socket.emitAsync<TransportOptions>(peerEventNames.signal, {
                        method: roomSignalMethods.createWebRtcTransport,
                        forceTcp: this.forceTcp,
                        producing: false,
                        consuming: true,
                        sctpCapabilities: this.useDataChannel
                            ? this.mediasoupDevice.sctpCapabilities
                            : undefined
                    });

                const {
                    id,
                    iceParameters,
                    iceCandidates,
                    dtlsParameters,
                    sctpParameters
                } = transportInfo;

                this.recvTransport = this.mediasoupDevice.createRecvTransport({
                    id,
                    iceParameters,
                    iceCandidates,
                    dtlsParameters,
                    sctpParameters,
                    // TODO: Trickle?
                    // iceServers: this.iceServers
                });

                this.recvTransport.on('connect',
                    ({dtlsParameters}, callback, errback) => {
                        this.socket?.emitAsync(peerEventNames.signal, {
                            method: roomSignalMethods.connectWebRtcTransport,
                            transportId: this.recvTransport?.id,
                            dtlsParameters
                        }).then(callback).catch(errback);
                        console.log(dtlsParameters)
                    });
            }

            // SET MEDIA C
            const peers: Peer[] =
                await this.socket.emitAsync<Peer[]>(peerEventNames.signal, {
                    method: roomSignalMethods.join,
                    displayName: this.displayName,
                    device: this.mediasoupDevice,
                    rtpCapabilities: this.consume ?
                        this.mediasoupDevice.rtpCapabilities : undefined,
                    sctpCapabilities: this.useDataChannel && this.consume ?
                        this.mediasoupDevice.sctpCapabilities : undefined
                });

            for (const peer of peers) {
                this.emit('peer', {...peer, consumers: [], dataConsumers: []});
                this.peers.set(peer.id, {...peer, consumers: [], dataConsumers: []});
            }

            if (this.produce) {
                await this.enableMic();
                const devicesCookie = getDevices();
                if (!devicesCookie || devicesCookie.webcamEnabled || this.externalVideo)
                    await this.enableWebcam();
            }
        } catch (error) {
            console.log(error)
            this.close();
            return error;
        }
    }

    subscribeToStatus(callback: (status: RoomStatus) => void) {
    }

    subscribeToAudioVideo(callback: (av: RoomStatus) => void) {
        // TODO: NAMEING
        this.on('audioVideo', callback)
    }

    subscribeToActiveSpeaker(callback: (av: ActiveSpeaker) => void) {
        this.on('speaker', callback);
    }

    unsubscribeFromAudioVideo(callbackToRemove: (av: RoomStatus) => void) {
        this.removeListener('audioVideo', callbackToRemove)
    }

    unsubscribeFromActiveSpeaker(callbackToRemove: (av: ActiveSpeaker) => void) {
        this.removeListener('speaker', callbackToRemove);
    }
}

export default Room