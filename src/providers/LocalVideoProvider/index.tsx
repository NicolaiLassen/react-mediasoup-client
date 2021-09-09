import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {useRoomManager} from "../RoomProvider";
import {useAudioVideo} from "../AudioVideoProvider";
import {LocalVideo} from "./LocalVideoProvider";
import {StreamState} from "../../types/StreamState";

type LocalVideoValue = LocalVideo | null;

export const LocalVideoContext = createContext<LocalVideoValue>(null);

const LocalVideoProvider: React.FC = ({children}) => {
    const roomManager = useRoomManager();
    const audioVideo = useAudioVideo()
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [id, setId] = useState<string | null>(null);

    useEffect(() => {
        if (!audioVideo) {
            return;
        }

        if (audioVideo.hasStartedLocalVideoTile()) {
            setIsVideoEnabled(true);
        }

        return () => {
            setIsVideoEnabled(false);
        };
    }, [audioVideo]);

    const toggleVideo = useCallback(async (): Promise<void> => {
        if (isVideoEnabled || !roomManager.selectedVideoInputDevice) {
            audioVideo?.stopLocalVideo();
            setIsVideoEnabled(false);
        } else {
            await audioVideo?.chooseVideoInputDevice(
                roomManager.selectedVideoInputDevice
            );
            audioVideo?.startLocalVideo();
            setIsVideoEnabled(true);
        }
    }, [audioVideo, isVideoEnabled, roomManager.selectedVideoInputDevice]);

    useEffect(() => {
        if (!audioVideo) {
            return;
        }

        const videoDidUpdate = (tileState: StreamState) => {
            if (
                !tileState.local ||
                !tileState.id ||
                id === tileState.id
            ) {
                return;
            }
            setId(tileState.id);
        };

        audioVideo.addObserver({
            videoTileDidUpdate: videoDidUpdate,
        });
    }, [audioVideo, id]);

    const value = useMemo(() => ({id, isVideoEnabled, setIsVideoEnabled, toggleVideo,}), [
        id,
        isVideoEnabled,
        setIsVideoEnabled,
        toggleVideo,
    ]);

    return (
        <LocalVideoContext.Provider value={value}>
            {children}
        </LocalVideoContext.Provider>
    )
}

const useLocalVideo = (): LocalVideoValue => {
    const context = useContext(LocalVideoContext)

    if (!context) {
        throw new Error('useLocalVideo must be used within LocalVideoProvider');
    }

    return context;
};

export {LocalVideoProvider, useLocalVideo}
