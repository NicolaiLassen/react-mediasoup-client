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
import {NewConsumer, NewDataConsumer, NewPeer, PeerClosed, RoomSignal, roomSignalMethods} from "./RoomSignal";
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
import {AudioVideo} from "../AudioVideoProvider/AudioVideo";
import {RoomStatus} from "./Device";
import {ActiveSpeakerPeer} from "../ActiveSpeakerProvider/ActiveSpeakerPeer";


class Room extends StrictEventEmitter<RoomEventMap> {

    readonly roomId: string;
    readonly peerId: string;
    readonly url: string;
    readonly path: string;
    roomStatus: RoomStatus = RoomStatus.Loading;

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

    private readonly useDataChannel: boolean;
    private readonly produce: boolean;
    private readonly consume: boolean;
    private readonly forceH264: boolean;
    private readonly forceTcp: boolean;
    private readonly forceVP9: boolean;
    private readonly useSimulcast: boolean;
    private readonly reconnectionTimeout: number;
    private readonly audioOnly: boolean;
    private readonly webcamOnly: boolean;
    private readonly svc: boolean;
    private readonly useSharingSimulcast: boolean;

    private readonly token?: string;
    selectedVideoInputDevice: string = "";

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
        this.roomStatus = RoomStatus.Ended;
    }

    async join() {
        if (this.closed)
            this.closed = false;
        if (this.joined)
            this.joined = false;

        this.socket = createPromiseSocket(this.url, {
            reconnectionDelayMax: this.reconnectionTimeout,
            query: {
                'peerId': this.peerId,
                'roomId': this.roomId
            },
            auth: {token: this.token},
            path: '/' + this.path,
            transports: ['websocket']
        });

        // Socket listeners
        this.socket.on('connect', async () => {
            console.debug('Room.join.socket.on.connect');
            await this.enterRoom();
        });
        this.socket.on('connect_error', async (err: any) => {
            console.debug(`Room.join.socket.io.on.connect_error: ${err}`);
            this.close()
        });
        this.socket.on('disconnect', async (reason: any) => {
            console.debug(`Room.socket.on.disconnect: ${reason}`);
            this.joined = false;
            this.sendTransport?.close()
            this.sendTransport = null;
            this.recvTransport?.close()
            this.recvTransport = null;
        });
        this.socket.on('signal', (res: RoomSignal) => {
            console.debug(`Room.join.socket.on.signal: ${res}`);
            this.handleSignal(res);
        });
        this.socket.on('notification', (res: RoomNotification) => {
            console.debug(`Room.join.socket.on.notification: ${res}`);
            this.handleNotification(res);
        });
    }

    private async enterRoom() {
        if (!this.socket)
            return;

        try {
            this.mediasoupDevice = new Device({handlerName: this.handlerName});
            const routerRtpCapabilities = await this.socket.emitAsync<RtpCapabilities>
            (peerEventNames.signal,
                {
                    method: 'getRouterRtpCapabilities'
                });

            await this.mediasoupDevice.load({routerRtpCapabilities});
            await ProducerSoundBrowserForce()

            if (this.produce) {
                const transportOptions = await this.socket.emitAsync<TransportOptions>
                (peerEventNames.signal,
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
                    console.debug(`Room.enterRoom.sendTransport.on.connect: ${this.sendTransport?.id}`);
                    this.socket?.emitAsync(peerEventNames.signal, {
                        method: roomSignalMethods.connectWebRtcTransport,
                        transportId: this.sendTransport?.id,
                        dtlsParameters
                    }).then(callback).catch(errback);
                });

                this.sendTransport.on('produce', async (
                    {kind, rtpParameters, appData}, callback, errback) => {
                    console.debug(`Room.enterRoom.sendTransport.on.produce: ${this.sendTransport?.id}`);
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
                    console.debug(`Room.enterRoom.sendTransport.on.connectionstatechange: ${connectionState}`);
                });
            }

            if (this.consume) {
                const transportInfo =
                    await this.socket.emitAsync<TransportOptions>
                    (peerEventNames.signal, {
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

                this.recvTransport =
                    this.mediasoupDevice.createRecvTransport({
                        id,
                        iceParameters,
                        iceCandidates,
                        dtlsParameters,
                        sctpParameters
                    });

                this.recvTransport.on('connect',
                    ({dtlsParameters}, callback, errback) => {
                        this.socket?.emitAsync(peerEventNames.signal, {
                            method: roomSignalMethods.connectWebRtcTransport,
                            transportId: this.recvTransport?.id,
                            dtlsParameters
                        }).then(callback).catch(errback);
                    });
            }

            const peers: Peer[] =
                await this.socket.emitAsync<Peer[]>
                (peerEventNames.signal, {
                    method: roomSignalMethods.join,
                    displayName: this.displayName,
                    device: this.mediasoupDevice,
                    rtpCapabilities: this.consume ?
                        this.mediasoupDevice.rtpCapabilities : undefined,
                    sctpCapabilities: this.useDataChannel && this.consume ?
                        this.mediasoupDevice.sctpCapabilities : undefined
                });

            peers.forEach((peer: Peer) => {
                this.peers.set(peer.id, {...peer, consumers: [], dataConsumers: []});
            });

            if (this.produce) {
                await this.enableMic();
                const devicesCookie = getDevices();
                if (!devicesCookie || devicesCookie.webcamEnabled || this.externalVideo)
                    await this.enableWebcam();
            }
            this.roomStatus = RoomStatus.Succeeded;

        } catch (error) {
            console.error(error)
            this.close();
            this.roomStatus = RoomStatus.Failed;
            return error;
        }
    }

    async changeWebcamResolution(resolution: Resolution) {
        this.webcam.resolution = resolution
        if (!this.webcam?.device) {
            console.debug(`Room.changeWebcamResolution`);
            this.emit('error', {
                type: 'device',
                severity: 'warning',
                message: 'No device found'
            });
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
                // TODO
                throw Error("Start webcamProducer");
            }

            await this.webcamProducer.replaceTrack({track});
        } catch (error) {
            console.error(`Room.changeWebcamResolution: ${error}`);
        }
    }

    async restartIce() {

    }

    async enableWebcam() {

        if (this.webcamProducer)
            return;
        if (!this.mediasoupDevice)
            return
        if (!this.mediasoupDevice.canProduce('video'))
            return;
        if (this.webcamLoading)
            return;

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

            if (!this.webcamProducer)
                return

            this.webcamProducer.on('transportclose', () => {
                console.log('transportclose')
                this.webcamProducer = undefined;
            });

            this.webcamProducer.on('trackended', () => {
                console.log('trackended')
                this.disableVideo();
            });

            this.producers.set(this.webcamProducer.id, this.webcamProducer)
            this.webcamLoading = false;
        } catch (error) {
            console.error(`Room.enableWebcam: ${error}`);
            if (track)
                track.stop();
        }
    }

    async disableVideo() {

    }

    async enableMic() {

        if (this.audioProducer)
            return;
        if (!this.mediasoupDevice?.canProduce('audio'))
            return;
        if (this.audioLoading)
            return;

        let track;
        this.audioLoading = true;
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
            this.audioLoading = false;
        } catch (error) {
            console.error(`Room.enableMic: ${error}`);
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
    }

    // Handle server signaling
    private async handleSignal(signal: RoomSignal) {
        switch (signal.method) {
            case 'newPeer': {
                this.newPeer(signal);
                break;
            }
            case 'peerClosed': {
                this.peerClosed(signal);
                break;
            }
            case 'newConsumer': {
                await this.newConsumer(signal);
                break;
            }
            case 'newDataConsumer': {
                await this.newDataConsumer(signal);
                break;
            }
        }
    }

    private newPeer(signal: NewPeer) {
        const peer = signal;
        this.peers.set(peer.id, {
            id: peer.id,
            device: peer.device,
            consumers: [],
            dataConsumers: []
        });
    }

    private peerClosed(signal: PeerClosed) {
        const {peerId} = signal;
        this.peers.delete(peerId);
    }

    private async newConsumer(signal: NewConsumer) {
        if (!this.consume)
            return;

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

            const consumer = await this.recvTransport.consume({
                id: consumerId,
                producerId,
                kind,
                rtpParameters,
                appData: {...appData, peerId}
            });

            if (!consumer.rtpParameters.encodings)
                return;

            const {spatialLayers, temporalLayers} =
                mediasoupClient.parseScalabilityMode(
                    consumer.rtpParameters.encodings[0].scalabilityMode);

            this.consumers.set(consumer.id, consumer);

            const peer = this.peers.get(peerId);

            if (!peer) {
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

            consumer.on('transportclose', () => {
                console.log('transportclose')
                this.emit('transport')
                this.consumers.delete(consumer.id);
            });

            if (consumer.kind === 'video' && this.audioOnly)
                this.pauseConsumer(consumer);

        } catch (error) {
            console.error(`Room.newConsumer: ${error}`);
        }
    }

    private pauseConsumer(consumer: Consumer) {

    }

    private async newDataConsumer(signal: NewDataConsumer) {
        if (!this.consume)
            return;

        if (!this.useDataChannel)
            return;

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
            console.error(`Room.newConsumer: ${error}`);
        }
    }

    // Handle server notification
    private handleNotification(notification: RoomNotification) {
        switch (notification.method) {
            case "activeSpeaker":
                this.activeSpeaker(notification);
                break;
        }
    }

    private activeSpeaker(notification: ActiveSpeaker) {
        this.emit('activeSpeaker', {peerId: notification, volume: notification.volume});
    }

    // Handle listeners
    subscribeToAudioVideo(callback: (av: AudioVideo) => void) {
        this.on('audioVideo', callback);
    }

    subscribeToActiveSpeaker(callback: (av: ActiveSpeakerPeer) => void) {
        this.on('speaker', callback);
    }

    unsubscribeFromAudioVideo(callbackToRemove: (av: AudioVideo) => void) {
        this.removeListener('audioVideo', callbackToRemove);
    }

    unsubscribeFromActiveSpeaker(callbackToRemove: (av: ActiveSpeakerPeer) => void) {
        this.removeListener('speaker', callbackToRemove);
    }
}

export default Room