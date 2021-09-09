export interface StreamState {
    id: string;
    local: boolean;
    streamId: string;
    peerId: string;
    videoStream: MediaStream | null;
    videoElement: HTMLVideoElement | null;
}