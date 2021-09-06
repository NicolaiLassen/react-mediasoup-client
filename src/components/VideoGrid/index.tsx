import React, {createContext, createRef} from "react";
import useElementAspectRatio from "../../hooks/useElementAspectRatio";
import {StyledVideoGrid} from "./Styled";

interface GridContext {
    usingGrid: boolean;
}

const GridContext = createContext<GridContext | null>(null);

export interface VideoGridProps extends React.HTMLAttributes<HTMLDivElement> {
    layout?: string;
}

export const VideoGrid: React.FC<VideoGridProps> =
    ({
         children,
         layout = 'standard',
         ...rest
     }) => {

        const gridEl = createRef<HTMLDivElement>();
        const ratio = useElementAspectRatio(gridEl);
        const childrenCount = React.Children.count(children);

        return (
            <GridContext.Provider value={{usingGrid: true}}>
                <StyledVideoGrid>
                    {children}
                </StyledVideoGrid>
            </GridContext.Provider>
        )
    }

export default VideoGrid;
