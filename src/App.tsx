import React, {useEffect, useState} from 'react';
import './App.css';
import RoomClient from "./lib/RoomClient";
import PeerView from "./lib/Components/PeerView";

function App() {

    const [room, setRoom] = useState<RoomClient>()

    useEffect(() => {
        const t = async () => {
            const newRoom = new RoomClient('http://localhost', 'innoTest123');
            await newRoom.join();
            await newRoom.enableWebcam()
            newRoom.on("webcamProducer", (track: MediaStreamTrack) => {
                console.log(track)
                setRoom(newRoom);
            })
        }
        t();
    }, [])

    return (
        <div>
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
