import {Consumer} from "mediasoup-client/lib/Consumer";
import {Producer} from "mediasoup-client/lib/Producer";

export interface Peer {
    id: string;
    consumers: Consumer[]
    dataConsumers: Producer[]
}