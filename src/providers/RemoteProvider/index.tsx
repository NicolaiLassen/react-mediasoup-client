import React, {createContext, useContext, useEffect, useReducer} from "react";

import {initialState, reducer, State, TileActionType} from './state';
import {useAudioVideo} from "../AudioVideoProvider";

const Context = createContext<State | null>(null);

const RemoteVideoProvider: React.FC = ({children}) => {

    const audioVideo = useAudioVideo();
    const [state, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        if (!audioVideo) {
            return;
        }
        return () => dispatch({type: TileActionType.RESET});
    }, [audioVideo]);

    return <Context.Provider value={state}>{children}</Context.Provider>;
}

const useRemote = (): State => {
    const state = useContext(Context);

    if (!state) {
        throw new Error(
            'useRemoteVideoTileState must be used within a RemoteVideoTileProvider'
        );
    }

    return state;
};

export {RemoteVideoProvider, useRemote};