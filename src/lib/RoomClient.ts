import {detectDevice, Device, types} from 'mediasoup-client';
import {StrictEventEmitter} from 'strict-event-emitter';
import {Consumer} from "mediasoup-client/lib/Consumer";
import {
    ActiveSpeakerResponse,
    DeviceStream,
    MeState,
    Resolution,
    RoomClientConfig,
    RoomClientSignal,
    RoomEventsMap
} from "./models/RoomClient";
import {
    PC_PROPRIETARY_CONSTRAINTS,
    VIDEO_CONSTRAINS,
    WEB_RTC_CONFIG,
    WEBCAM_KSVC_ENCODINGS,
    WEBCAM_SIMULCAST_ENCODINGS
} from "./constants";
import {BuiltinHandlerName} from "mediasoup-client/lib/Device";
import {RtpCapabilities} from "mediasoup-client/lib/RtpParameters";
import {playSoundBrowserHack, uuidv4} from "./utils/webRTCUtil";
import {TransportOptions} from "mediasoup-client/lib/Transport";
import {Producer} from "mediasoup-client/lib/Producer";
import {Peer} from "./models/Peer";
import {io, Socket} from "socket.io-client";
import {DataConsumer} from "mediasoup-client/lib/DataConsumer";
import {getDevices} from "./utils/cookieStore";

const roomConfigDefault: RoomClientConfig = {
    produce: true,
    consume: false,
    forceH264: false,
    forceTcp: false,
    forceVP9: false,
    svc: false,
    useDataChannel: false,
    useSharingSimulcast: false,
    useSimulcast: false,
    displayName: "",
    datachannel: "",
    resolution: 'hd',
    muted: false,
    webcamOnly: false,
    audioOnly: false,
    reconnectionTimeout: 1000
}

class RoomClient extends StrictEventEmitter<RoomEventsMap> {

    readonly roomId: string;
    readonly peerId: string;
    readonly url: string;
    readonly nsp: string;

    private socket?: Socket;
    private sendTransport: types.Transport | null = null;
    private recvTransport: types.Transport | null = null;
    private readonly webcam: DeviceStream;
    private webcams = new Map<string, MediaDeviceInfo>();

    private mediaDevice?: Device;
    private producers: Map<string, Producer> = new Map<string, Producer>()
    private displayName?: string

    // TODO: Peer model
    private peerMap: Map<string, Peer> = new Map<string, Peer>()

    private muted;
    private joined = false;
    private closed = false;
    private externalVideo = false;

    private me: MeState = {}

    private consumers = new Map<string, Consumer>();
    private dataConsumers = new Map<string, DataConsumer>();
    private readonly handlerName?: BuiltinHandlerName;

    webcamProducer?: Producer;
    webcamLoading = false;

    audioProducer?: Producer;
    audioLoading = false;

    shareProducer? = Producer;
    shareProducerLoading = false;

    private iceServers = WEB_RTC_CONFIG.iceServers;
    private activeSpeakerId?: string;

    // CONFIGS
    private audioOnly = false;
    private webcamOnly = false
    private mediaCapabilities: any;
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
                config?: Partial<RoomClientConfig>,
                nsp: string = 'socket.io',
    ) {
        super();
        const defaultConfig: RoomClientConfig = {
            ...roomConfigDefault,
            ...config
        }

        this.url = url;
        this.roomId = roomId;
        this.peerId = peerId ?? uuidv4();
        this.nsp = nsp;

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
        if (this.joined) {
            this.emit('resetJoin')
            this.joined = false;
        }

        this.socket = io(this.url, {
            reconnectionDelayMax: this.reconnectionTimeout,
            query: {
                'peerId': this.peerId,
                'roomId': this.roomId
            },
            auth: {
                token: this.token
            }
        });

        this.socket.on('connect', async () => {
            console.debug('socket.io.on.connect');
            this.emit('state', 'connect');
            console.log("connect")
            await this.enterRoom();
        });

        this.socket.on('connect_error', async (err) => {
            console.debug('socket.io.on.connect_error');
            this.emit('error', err)
        });

        this.socket.on('disconnect', async (reason) => {
            console.log(reason)
            console.debug('socket.io.on.disconnect');
            this.joined = false;
            this.emit('state', 'disconnect');
            this.sendTransport?.close()
            this.sendTransport = null;
            this.recvTransport?.close()
            this.recvTransport = null;
        });

        this.socket.on('signal', (res: RoomClientSignal) => {
            console.debug('socket.io.on.signal', res);
            this.handleSignal(res);
        });

        this.socket.on('activeSpeaker', (res: ActiveSpeakerResponse) => {
            console.debug('socket.io.on.activeSpeaker', res);
            this.activeSpeakerId = res.peerId;
            this.emit('activeSpeaker', res);
        });
    }

    async changeWebcamResolution(resolution: Resolution) {
        this.webcam.resolution = resolution
        if (!this.webcam?.device) {
            this.emit('device', {
                type: 'warning',
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
            await this.webcamProducer?.replaceTrack({track});
        } catch (error) {

        }
    }

    async restartIce() {

    }

    async enableWebcam() {

        if (this.webcamProducer)
            return;
        if (!this.mediaDevice) {
            this.emit("device")
            return
        }

        if (!this.mediaDevice.canProduce('video')) {
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
                const stream = await this.getExternalVideoStream();
                track = stream.getVideoTracks()[0].clone();
            }

            let encodings;
            let codec;
            const codecOptions = {videoGoogleStartBitrate: 1000};

            const codecs = this.mediaDevice.rtpCapabilities.codecs;
            if (!codecs) {
                return
            }

            if (this.forceH264) {
                codec = codecs.find((c) => c.mimeType.toLowerCase() === 'video/h264');
                if (!codec) {
                    this.emit("")
                }
            } else if (this.forceVP9) {
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

            if (!this.webcamProducer) {
                return
            }

            this.webcamProducer.on('transportclose', () => {
                this.webcamProducer = undefined;
            });

            this.webcamProducer.on('trackended', () => {
                this.disableVideo();
            });

            // TODO: local stream
            this.emit('webcamProducer', track)
        } catch (error) {
            if (track)
                track.stop();
        }
    }

    async disableVideo() {

    }

    async enableMic() {
        if (this.audioProducer)
            return;

        if (!this.mediaDevice?.canProduce('audio')) {
            // logger.error('enableMic() | cannot produce audio');
            return;
        }

        let track;
        try {
            if (!this.externalVideo) {
                // logger.debug('enableMic() | calling getUserMedia()');
                const stream = await navigator.mediaDevices.getUserMedia({audio: true});
                track = stream.getAudioTracks()[0];
            } else {
                const stream = await this.getExternalVideoStream();
                track = stream.getAudioTracks()[0].clone();
            }

            const producer =
                await this.sendTransport?.produce({
                    track,
                    codecOptions: {
                        opusStereo: true,
                        opusDtx: true
                    }
                });

            if (!producer) {
                this.emit('');
                return;
            }

            this.producers.set(producer.id, producer)

            producer.on('transportclose', () => {
                this.audioProducer = undefined;
            });

            producer.on('trackended', () => {

                // TODO
                this.emit('producer',
                    {
                        type: 'warning',
                        message: 'Microphone disconnected!'
                    }
                );
                this.disableMic();
            });
        } catch (error) {
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

    private getExternalVideoStream(): MediaStream {
        this.emit('deviceStream');
        return new MediaStream();
    }

    private async handleSignal(signal: RoomClientSignal) {
        console.log("signal", signal)
        switch (signal.method) {
            case 'newPeer': {
                const peer = signal;

                // store.dispatch(
                //     stateActions.addPeer(
                //         {...peer, consumers: [], dataConsumers: []}));
                //
                // store.dispatch(requestActions.notify(
                //     {
                //         text: `${peer.displayName} has joined the room`
                //     }));

                break;
            }
            case 'newConsumer': {

                if (!this.consume) {
                    this.emit('reject')
                    // reject(403, 'I do not want to consume');
                    break;
                }

                const {
                    peerId,
                    producerId,
                    id,
                    kind,
                    rtpParameters,
                    appData
                } = signal;

                try {
                    const consumer = await this.recvTransport?.consume(
                        {
                            id,
                            producerId,
                            kind,
                            rtpParameters,
                            appData: {...appData, peerId} // Trick.
                        });

                    if (!consumer) {
                        return;
                    }

                    this.consumers.set(consumer.id, consumer);

                    consumer.on('transportclose', () => {
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
                if (!this.consume) {
                    // reject(403, 'I do not want to data consume');
                    break;
                }

                if (!this.useDataChannel) {
                    // reject(403, 'I do not want DataChannels');
                    break;
                }

                const {
                    peerId,
                    dataProducerId,
                    id,
                    sctpStreamParameters,
                    label,
                    protocol,
                    appData
                } = signal;

                try {
                    const dataConsumer = await this.recvTransport?.consumeData(
                        {
                            id,
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

    private pauseConsumer(consumer: Consumer) {

    }

    private async enterRoom() {

        if (!this.socket) {
            this.emit('socket', {
                type: 'error',
                message: 'Socket not connected'
            })
            return
        }

        try {
            this.mediaDevice = new Device({handlerName: this.handlerName});
            const routerRtpCapabilities = await this.socketEmitCallback<RtpCapabilities>('signal', {
                method: 'getRouterRtpCapabilities'
            });
            await this.mediaDevice.load({routerRtpCapabilities});
            await playSoundBrowserHack() // force data channel for Browser;

            if (this.produce) {
                const transportOptions = await this.socketEmitCallback<TransportOptions>('signal', {
                    method: 'createWebRtcTransport',
                    forceTcp: this.forceTcp,
                    producing: true,
                    consuming: false,
                    sctpCapabilities: this.useDataChannel ? this.mediaDevice.sctpCapabilities : undefined
                });

                const {
                    id,
                    iceParameters,
                    iceCandidates,
                    dtlsParameters,
                    sctpParameters
                } = transportOptions;

                this.sendTransport = this.mediaDevice.createSendTransport({
                    id,
                    iceParameters,
                    iceCandidates,
                    dtlsParameters,
                    sctpParameters,
                    iceServers: this.iceServers,
                    proprietaryConstraints: PC_PROPRIETARY_CONSTRAINTS
                });

                this.sendTransport.on('connect', (
                    {dtlsParameters}, callback, errback) => {
                    this.socketEmitCallback('signal', {
                        method: 'connectWebRtcTransport',
                        transportId: this.sendTransport?.id,
                        dtlsParameters
                    }).then(callback).catch(errback);
                });

                this.sendTransport.on('produce', async (
                    {kind, rtpParameters, appData}, callback, errback) => {
                    this.socketEmitCallback('signal', {
                        method: 'produce',
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
                    await this.socketEmitCallback('signal', {
                        method: 'produceData',
                        transportId: this.sendTransport?.id,
                        sctpStreamParameters,
                        label,
                        protocol,
                        appData
                    }).then(callback).catch(errback);
                });
            }

            if (this.consume) {
                const transportInfo =
                    await this.socketEmitCallback<TransportOptions>('signal', {
                        method: 'createWebRtcTransport',
                        forceTcp: this.forceTcp,
                        producing: false,
                        consuming: true,
                        sctpCapabilities: this.useDataChannel
                            ? this.mediaDevice.sctpCapabilities
                            : undefined
                    });

                const {
                    id,
                    iceParameters,
                    iceCandidates,
                    dtlsParameters,
                    sctpParameters
                } = transportInfo;

                this.recvTransport = this.mediaDevice.createRecvTransport({
                    id,
                    iceParameters,
                    iceCandidates,
                    dtlsParameters,
                    sctpParameters,
                    iceServers: this.iceServers
                });

                this.recvTransport.on('connect',
                    ({dtlsParameters}, callback, errback) => {
                        this.socketEmitCallback('signal', {
                            method: 'connectWebRtcTransport',
                            transportId: this.recvTransport?.id,
                            dtlsParameters
                        }).then(callback).catch(errback);
                    });
            }

            const peers: Peer[] =
                await this.socketEmitCallback<Peer[]>('signal', {
                    method: 'join',
                    displayName: this.displayName,
                    device: this.mediaDevice,
                    rtpCapabilities: this.consume
                        ? this.mediaDevice.rtpCapabilities
                        : undefined,
                    sctpCapabilities: this.useDataChannel && this.consume
                        ? this.mediaDevice.sctpCapabilities
                        : undefined
                });

            for (const peer of peers) {
                this.peerMap.set(peer.id, {...peer, consumers: [], dataConsumers: []});
            }

            if (this.produce) {

                this.mediaCapabilities = {
                    canSendMic: this.mediaDevice.canProduce('audio'),
                    canSendWebcam: this.mediaDevice.canProduce('video')
                }

                await this.enableMic();

                const devicesCookie = getDevices();
                if (!devicesCookie || devicesCookie.webcamEnabled || this.externalVideo)
                    await this.enableWebcam();

                this.sendTransport?.on('connectionstatechange', (connectionState) => {
                    // if (connectionState === 'connected') {
                    //     this.enableChatDataProducer();
                    //     this.enableBotDataProducer();
                    // }
                });
            }
        } catch (error) {
            console.log(error)
            this.close();
            return error;
        }
    }

    // Can't extend class for this version of SOCKET...
    private async socketEmitCallback<T>(method: string, args?: Record<string, string | number | boolean | any>): Promise<T> {
        return await new Promise((resolve, reject) => {
            this.socket?.emit(method, args, (res: T) => {
                console.log('socket-callback', res)
                return resolve(res)
            });
        });
    }

}

export default RoomClient