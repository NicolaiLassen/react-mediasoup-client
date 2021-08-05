import React, {useEffect, useRef} from "react";

interface PeerViewProps {
    isMe: boolean;
    audioMuted?: boolean;
    audioTrack?: MediaStreamTrack | null;
    videoTrack?: MediaStreamTrack | null;
}

const PeerView: React.FC<PeerViewProps> = (
    {
        isMe,
        audioMuted = false,
        audioTrack,
        videoTrack
    }) => {

    // const [videoState, setVideoState] = useState<boolean>();
    const audioElem = useRef<HTMLAudioElement>(null);
    const videoElem = useRef<HTMLVideoElement>(null);

    useEffect(() => {

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

            // videoElem.current.oncanplay = () => setVideoState(true);

            videoElem.current.onplay = () => {
                if (!audioElem.current)
                    return;
                // this.setState({ videoElemPaused: false });
                audioElem.current.play()
                    .catch((error) => console.log('audioElem.play() failed:%o', error));
            };

            // videoElem.current.onpause = () => setVideoState(true);

            videoElem.current.play()
                .catch((error) => console.log('audioElem.play() failed:%o', error));

            // this._startVideoResolution();
        }

    }, [audioTrack, videoTrack])

    return (
        <div style={{background: 'black', width: 400, height: 400}}>
            <video
                ref={videoElem}
                autoPlay
                style={{transform: isMe ? 'scaleX(-1)' : '', width: 400, height: 400}}
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