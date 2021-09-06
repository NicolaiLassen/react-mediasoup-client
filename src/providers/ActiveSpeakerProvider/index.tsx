import React, {createContext, useContext, useEffect, useState} from 'react';
import {useRoomManager} from "../RoomProvider";
import {ActiveSpeaker} from "./ActiveSpeaker";

type ActiveSpeakerValue = ActiveSpeaker | null;

export const ActiveSpeakerContext = createContext<ActiveSpeakerValue>(null);

const ActiveSpeakerProvider: React.FC = ({children}) => {
    const roomManager = useRoomManager();
    const [activeSpeaker, setActiveSpeaker] = useState<ActiveSpeakerValue>(null);

    const handleActiveSpeaker = (speaker: ActiveSpeaker) => {
        setActiveSpeaker(speaker);
    }

    useEffect(() => {
        roomManager.subscribeToActiveSpeaker(handleActiveSpeaker);
        return () => roomManager.unsubscribeFromActiveSpeaker(handleActiveSpeaker);
    }, []);

    return (
        <ActiveSpeakerContext.Provider value={activeSpeaker}>
            {children}
        </ActiveSpeakerContext.Provider>
    );
};

const useActiveSpeaker = (): ActiveSpeakerValue => {
    const context = useContext(ActiveSpeakerContext);

    if (!context) {
        throw new Error('useActiveSpeaker must be used within activeSpeakerProvider');
    }

    return context;
};

export {useActiveSpeaker, ActiveSpeakerProvider};