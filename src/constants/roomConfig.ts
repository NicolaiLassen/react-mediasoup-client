import {RoomConfig} from "../providers/RoomProvider/RoomConfig";
import {uuidv4} from "../utils/webRTCUtil";

export const ROOM_CONFIG_DEFAULT: RoomConfig = {
    produce: true,
    consume: true,
    forceH264: false,
    forceTcp: false,
    forceVP9: false,
    svc: false,
    useDataChannel: false,
    useSharingSimulcast: false,
    useSimulcast: true,
    displayName: uuidv4(),
    datachannel: '',
    resolution: 'hd',
    muted: false,
    webcamOnly: false,
    audioOnly: false,
    reconnectionTimeout: 1000
}