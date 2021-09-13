export default interface AudioVideoObserver {

}

export interface AudioVideo {
    addObserver(observer: AudioVideoObserver): void;

    removeObserver(observer: AudioVideoObserver): void;

    hasStartedLocalVideoTile(): boolean;

    stopLocalVideo(): void;

    startLocalVideo(): void;

    chooseVideoInputDevice(device: string): void;
}
