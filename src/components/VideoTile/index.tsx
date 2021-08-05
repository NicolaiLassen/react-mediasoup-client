import React, {forwardRef, HTMLAttributes} from "react";
import {StyledVideoTile} from "./Styled";

type ObjectFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface VideoTileProps
    extends Omit<HTMLAttributes<HTMLDivElement>, 'css'> {
    objectFit?: ObjectFit;
    me?: boolean;
}

export const VideoTile = forwardRef(
    (props: VideoTileProps, ref: React.Ref<HTMLVideoElement>) => {
        const {me, className, ...rest} = props;

        return (
            <StyledVideoTile
                className="inno-video"
                {...rest}
            >
                <video ref={ref}/>
            </StyledVideoTile>
        );
    }
);

export default VideoTile;