import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {useRoomManager} from "../RoomProvider";
import {useAudioVideo} from "../AudioVideoProvider";
import {LocalVideo} from "./LocalVideoProvider";

type LocalVideoValue = LocalVideo | null;

export const LocalVideoContext = createContext<LocalVideoValue>(null);

const LocalVideoProvider: React.FC = ({children}) => {
    const roomManager = useRoomManager();
    const audioVideo = useAudioVideo()
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [tileId, setTileId] = useState<number | null>(null);

    useEffect(() => {
        if (!audioVideo) {
            return;
        }

        // TODO
        if (audioVideo.hasStartedLocalVideoTile()) {
            setIsVideoEnabled(true);
        }

        return () => {
            setIsVideoEnabled(false);
        };
    }, [audioVideo]);

    const toggleVideo = useCallback(async (): Promise<void> => {
        if (isVideoEnabled || !roomManager.selectedVideoInputDevice) {
            audioVideo?.stopLocalVideoTile();
            setIsVideoEnabled(false);
        } else {
            await audioVideo?.chooseVideoInputDevice(
                roomManager.selectedVideoInputDevice
            );
            audioVideo?.startLocalVideoTile();
            setIsVideoEnabled(true);
        }
    }, [audioVideo, isVideoEnabled, roomManager.selectedVideoInputDevice]);

    useEffect(() => {
        if (!audioVideo) {
            return;
        }

        const videoTileDidUpdate = (tileState: VideoTileState) => {
            if (
                !tileState.localTile ||
                !tileState.tileId ||
                tileId === tileState.tileId
            ) {
                return;
            }

            setTileId(tileState.tileId);
        };

        audioVideo.addObserver({
            videoTileDidUpdate,
        });
    }, [audioVideo, tileId]);

    const value = useMemo(() => ({tileId, isVideoEnabled, setIsVideoEnabled, toggleVideo,}), [
        tileId,
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
