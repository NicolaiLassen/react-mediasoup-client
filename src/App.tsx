import React, {useEffect, useState} from 'react';
import './App.css';
import RoomClient from "./lib/RoomClient";
import PeerView from "./lib/Components/PeerView";
import {Peer} from "./lib/models/Peer";
import {Consumer} from "mediasoup-client/lib/Consumer";

function App() {

    const [room, setRoom] = useState<RoomClient>()
    const [tracks, setTracks] = useState<{
        video?: MediaStreamTrack
        audio?: MediaStreamTrack
    }>()

    useEffect(() => {
        const t = async () => {
            const newRoom = new RoomClient('http://rtc.innosocial.dk', 'innoTest123');
            await newRoom.join();
            await newRoom.enableWebcam()
            newRoom.on("webcamProducer", (track: MediaStreamTrack) => {
                console.log(track)
                setRoom(newRoom);
            })

            newRoom.on("peer", (peer: Peer) => {
                let audio;
                let video;
                peer.consumers.forEach((c: Consumer) => {
                    if (c.kind === 'audio') {
                        audio = c.track
                    } else {
                        video = c.track
                    }
                })

                setTracks({audio, video})
            })
        }
        t();
    }, [])

    return (
        <div>
            {tracks &&
            <PeerView isMe={false}
                      audioTrack={tracks.audio}
                      videoTrack={tracks.video}
            />
            }
            {room &&
            <PeerView
                isMe={false}
                audioMuted={false}
                audioTrack={room.audioProducer?.track}
                videoTrack={room.webcamProducer?.track}
            />
            }
        </div>
    );
}

export default App;
