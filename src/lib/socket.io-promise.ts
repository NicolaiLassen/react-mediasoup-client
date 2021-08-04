import {Socket} from "socket.io-client";

export interface PromiseSocket extends Socket {
    emitAsync: <T>(method: string, data?: any) => Promise<T>
}

export const promise = (socket: Socket) =>
    <T>(method: string, data = {}) => {
        return new Promise((resolve) => {
            socket.emit(method, data, (res: (T)) => resolve(res));
        });
    }
