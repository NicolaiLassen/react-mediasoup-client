import {EventsMap} from "socket.io-client/build/typed-events";
import {ActiveSpeaker} from "./RoomNotification";

export interface RoomEventMap extends EventsMap {
    request: (req: Request) => void
    response: (res: Response) => void;
    close: () => void
    speaker: (req: ActiveSpeaker) => void;
    stream: () => void;
    state: (state: string) => void;
}