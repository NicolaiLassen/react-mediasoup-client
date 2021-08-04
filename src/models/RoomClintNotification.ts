export interface ActiveSpeaker {
    method: 'activeSpeaker'
    peerId: string,
    volume: number
}

export interface ActiveSpeakerSilence {
    method: 'activeSpeakerSilence'
    peerId: string,
}

export type RoomClientNotification = ActiveSpeaker
    | ActiveSpeakerSilence;
