import React, {createContext, useContext, useEffect, useState} from 'react';
import {AudioVideo} from "./AudioVideo";
import {useRoomManager} from "../RoomProvider";

type AudioVideoValue = AudioVideo | null;

export const AudioVideoContext = createContext<AudioVideoValue>(null);

const AudioVideoProvider: React.FC = ({children}) => {
    const roomManager = useRoomManager();
    const [audioVideo, setAudioVideo] = useState<AudioVideoValue>(null);

    const audioVideoUpdateCb = (av: AudioVideoValue) => {
        setAudioVideo(av);
    }

    useEffect(() => {
        roomManager.subscribeToAudioVideo(audioVideoUpdateCb);
        return () => roomManager.unsubscribeFromAudioVideo(audioVideoUpdateCb);
    }, []);

    return (
        <AudioVideoContext.Provider value={audioVideo}>
            {children}
        </AudioVideoContext.Provider>
    );
};

const useAudioVideo = (): AudioVideoValue => {
    const context = useContext(AudioVideoContext);

    if (!context) {
        throw new Error('useAudioVideo must be used within audioVideoProvider');
    }

    return context;
};

export {useAudioVideo, AudioVideoProvider};