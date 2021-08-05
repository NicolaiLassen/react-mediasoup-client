import {useEffect, useState} from "react";
import {RoomClientConfig} from "../models/RoomClientConfig";
import RoomClient from "../lib/RoomClient";

interface useRoomProps {
    url: string;
    roomId: string;
    peerId: string;
    config: RoomClientConfig;
}

const useRoomManager = ({url, roomId, peerId, config}: useRoomProps) => {

    const [room, setRoom] = useState(new RoomClient('http://rtc.innosocial.dk', 'innoTest123'));

    useEffect(() => {
        return room.close();
    }, [room]);

    return {}
}

export default useRoomManager;