type tileMap = {
    [key: string]: string;
};

type peerMap = {
    [key: string]: number;
};

export type State = {
    tiles: number[];
    tileIdToPeerId: tileMap;
    peerIdToTileId: peerMap;
    size: number;
};

export enum VideoTileActionType {
    UPDATE,
    REMOVE,
    RESET,
}

type UpdateAction = {
    type: VideoTileActionType.UPDATE;
    payload: {
        tileId: number;
        peerId: string;
    };
};

type RemoveAction = {
    type: VideoTileActionType.REMOVE;
    payload: {
        tileId: number;
        peerId?: string;
    };
};

type ResetAction = {
    type: VideoTileActionType.RESET;
    payload?: any;
};

export type Action = UpdateAction | RemoveAction | ResetAction;

export const initialState: State = {
    tiles: [],
    tileIdToPeerId: {},
    peerIdToTileId: {},
    size: 0,
};

const removeProperty = (obj: { [key: string]: any }, property: string) => {
    const newState = Object.assign({}, obj);
    delete newState[property];
    return newState;
};

export function reducer(state: State, {type, payload}: Action): State {
    const {tiles, tileIdToPeerId, peerIdToTileId, size} = state;

    switch (type) {
        case VideoTileActionType.UPDATE: {
            const {tileId, peerId = ''} = payload;
            const tileStr = tileId.toString();
            const isPresent = tileIdToPeerId[tileStr];

            if (isPresent) {
                return state;
            }

            const newTiles = [...tiles, tileId];
            const tileIds = {
                ...tileIdToPeerId,
                [tileStr]: peerId,
            };
            const peerIds = {
                ...peerIdToTileId,
                [peerId]: tileId,
            };

            return {
                tiles: newTiles,
                tileIdToPeerId: tileIds,
                peerIdToTileId: peerIds,
                size: size + 1,
            };
        }
        case VideoTileActionType.REMOVE: {
            const {tileId} = payload;
            const peerId = tileIdToPeerId[tileId];
            const tileStr = tileId.toString();

            if (!peerId) {
                return state;
            }

            const newTiles = tiles.filter((id) => tileId !== id);
            const tileIds = removeProperty(tileIdToPeerId, tileStr);
            const peerIds = removeProperty(peerIdToTileId, peerId);

            return {
                tiles: newTiles,
                tileIdToPeerId: tileIds,
                peerIdToTileId: peerIds,
                size: size - 1,
            };
        }
        case VideoTileActionType.RESET: {
            return initialState;
        }
        default:
            throw new Error('Incorrect type in VideoProvider');
    }
}