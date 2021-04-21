import Cookies from 'universal-cookie';
import {DEVICES_COOKIE, USER_COOKIE} from "../constants";

const cookies = new Cookies();

export const getUser = () => cookies.get(USER_COOKIE);
export const getDevices = () => cookies.get(DEVICES_COOKIE);

export const setUser = (displayName: string) => {
    cookies.set(USER_COOKIE, displayName);
}

export function setDevices(webcamEnabled: boolean) {
    cookies.set(DEVICES_COOKIE, webcamEnabled);
}
