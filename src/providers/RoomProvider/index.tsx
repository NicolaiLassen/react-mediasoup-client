import React, {createContext, useContext, useState} from "react";
import Room from "./Room";
import {AudioVideoProvider} from "../AudioVideoProvider";
import {LocalVideoProvider} from "../LocalVideoProvider";
import {RoomConfig} from "./RoomConfig";
import {ActiveSpeakerProvider} from "../ActiveSpeakerProvider";
import {RemotePeerProvider} from "../RemotePeerProvider";
import {DevicesProvider} from "../DevicesProvider";

export const RoomContext = createContext<Room | null>(null);

interface RoomProviderProps {
    roomId: string;
    peerId?: string;
    token?: string;
    url?: string;
    path?: string;
    config?: Partial<RoomConfig>;

}

export const RoomProvider: React.FC<RoomProviderProps> =
    ({
         roomId,
         peerId,
         token = '',
         url = '',
         path = 'server',
         config,
         children,

     }) => {

        const [roomClient] = useState(new Room(url, roomId, peerId, config, path));

        return (
            <RoomContext.Provider value={roomClient}>
                <AudioVideoProvider>
                    <DevicesProvider>
                        <RemotePeerProvider>
                            <ActiveSpeakerProvider>
                                <LocalVideoProvider>
                                    {children}
                                </LocalVideoProvider>
                            </ActiveSpeakerProvider>
                        </RemotePeerProvider>
                    </DevicesProvider>
                </AudioVideoProvider>
            </RoomContext.Provider>
        );
    };


export const useRoomManager = (): Room => {
    const roomManager = useContext(RoomContext);

    if (!roomManager) {
        throw new Error('useRoomManager must be used within RoomProvider');
    }

    return roomManager;
};