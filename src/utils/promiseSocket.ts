import {io, Socket} from "socket.io-client";
import {ManagerOptions} from "socket.io-client/build/manager";
import {SocketOptions} from "socket.io-client/build/socket";

export interface PromiseSocket extends Socket {
    emitAsync: <T>(method: string, data?: any) => Promise<T>
}

export const createPromiseSocket = (url: string, opts?: Partial<ManagerOptions & SocketOptions>): PromiseSocket => {
    const ioSocket = <any>io(url, opts);
    ioSocket.emitAsync = socketPromise(ioSocket);
    return ioSocket as PromiseSocket;
}

export const socketPromise = (socket: Socket) =>
    <T>(method: string, data = {}) => {
        return new Promise((resolve) => {
            socket.emit(method, data, (res: (T)) => resolve(res));
        });
    }