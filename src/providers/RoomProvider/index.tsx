import React, {createContext, useContext, useState} from "react";
import RoomClient from "../../lib/RoomClient";

export const RoomContext = createContext<RoomClient | null>(null);

interface RoomProviderProps {

}

export const RoomProvider: React.FC<RoomProviderProps> =
    ({
         children,
     }) => {

        const [roomClient] = useState(new RoomClient("", "", ""));

        return (
            <RoomContext.Provider value={roomClient}>
                {/*<AudioVideoProvider>*/}
                {/*    <DevicesProvider>*/}
                {/*        <RosterProvider>*/}
                {/*            <RemoteVideoTileProvider>*/}
                {/*                <LocalVideoProvider>*/}
                {/*                    <LocalAudioOutputProvider>*/}
                {/*                        <ContentShareProvider>*/}
                {/*                            <FeaturedVideoTileProvider>*/}
                {children}
                {/*                            </FeaturedVideoTileProvider>*/}
                {/*                        </ContentShareProvider>*/}
                {/*                    </LocalAudioOutputProvider>*/}
                {/*                </LocalVideoProvider>*/}
                {/*            </RemoteVideoTileProvider>*/}
                {/*        </RosterProvider>*/}
                {/*    </DevicesProvider>*/}
                {/*</AudioVideoProvider>*/}
            </RoomContext.Provider>
        );
    };


export const useRoomManager = (): RoomClient => {
    const meetingManager = useContext(RoomContext);

    if (!meetingManager) {
        throw new Error('useRoomManager must be used within RoomProvider');
    }

    return meetingManager;
};