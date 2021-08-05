import React, {forwardRef, HTMLAttributes} from "react";
import {makeStyles} from "@material-ui/core";

type ObjectFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface VideoTileProps
    extends Omit<HTMLAttributes<HTMLDivElement>, 'css'> {
    objectFit?: ObjectFit;
}

const useStyles = makeStyles((theme) => ({
    innoVideo: {
        margin: theme.spacing(4),
        maxWidth: '100%',
        [theme.breakpoints.down('sm')]: {
            margin: theme.spacing(2, 0),
        },
    },
}));

export const VideoTile = forwardRef(
    (props: VideoTileProps, ref: React.Ref<HTMLVideoElement>) => {

        const classes = useStyles();
        const {className, ...rest} = props;

        return (
            <div
                className={className}
                {...rest}
            >
                <video ref={ref} className={classes.innoVideo}/>
            </div>
        );
    }
);

export default VideoTile;