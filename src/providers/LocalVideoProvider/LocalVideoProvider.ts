export type LocalVideo = {
    id: null | string;
    isVideoEnabled: boolean;
    setIsVideoEnabled: (isEnabled: boolean) => void;
    toggleVideo: () => Promise<void>;
};
