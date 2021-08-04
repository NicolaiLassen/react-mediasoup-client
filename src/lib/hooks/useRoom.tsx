import {useEffect, useState} from "react";
import RoomClient from "../RoomClient";
import {RoomClientConfig} from "../models/RoomClientConfig";

interface useRoomProps {
    url: string;
    roomId: string;
    peerId: string;
    config: RoomClientConfig;
}

const useRoom = ({}) => {

    const [room, setRoom] = useState(new RoomClient('http://rtc.innosocial.dk', 'innoTest123'));

    useEffect(() => {
        return room.close();
    }, [room]);

    return {}
}

export default useRoom;