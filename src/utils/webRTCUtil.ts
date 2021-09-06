export const ProducerSoundBrowserForce = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    const audioTrack = stream.getAudioTracks()[0];
    audioTrack.enabled = false;
    setTimeout(() => audioTrack.stop(), 120000);
}

export const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
