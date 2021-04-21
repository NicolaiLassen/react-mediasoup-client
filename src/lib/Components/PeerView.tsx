import React, {useEffect, useRef, useState} from "react";

interface PeerView {
    isMe: boolean;
    audioMuted?: boolean;
    audioTrack?: MediaStreamTrack | null;
    videoTrack?: MediaStreamTrack | null;
}

const PeerView: React.FC<PeerView> = (
    {
        isMe,
        audioMuted = false,
        audioTrack,
        videoTrack
    }) => {

    const [videoState, setVideoState] = useState<boolean>();
    const audioElem = useRef<HTMLAudioElement>(null);
    const videoElem = useRef<HTMLVideoElement>(null);

    useEffect(() => {

        console.log("test")

        if (audioTrack) {
            console.log("audioTrack")
            if (!audioElem.current)
                return;
            const stream = new MediaStream();
            stream.addTrack(audioTrack);
            audioElem.current.srcObject = stream;
            audioElem.current.play()
                .catch((error) => console.log('audioElem.play() failed:%o', error));
        }

        if (videoTrack) {
            console.log("videoTrack")
            if (!videoElem.current)
                return;

            const stream = new MediaStream();
            stream.addTrack(videoTrack);
            videoElem.current.srcObject = stream;

            videoElem.current.oncanplay = () => setVideoState(true);

            videoElem.current.onplay = () => {
                if (!audioElem.current)
                    return;
                // this.setState({ videoElemPaused: false });
                audioElem.current.play()
                    .catch((error) => console.log('audioElem.play() failed:%o', error));
            };

            videoElem.current.onpause = () => setVideoState(true);

            videoElem.current.play()
                .catch((error) => console.log('audioElem.play() failed:%o', error));

            // this._startVideoResolution();
        }

    }, [audioTrack, videoTrack])

    return (
        <div style={{background: 'black', width: 200, height: 200}}>
            <video
                ref={videoElem}
                autoPlay
                playsInline
                muted
                controls={false}
            />

            <audio
                ref={audioElem}
                autoPlay
                playsInline
                muted={isMe || audioMuted}
                controls={false}
            />

        </div>
    )
}

export default PeerView;