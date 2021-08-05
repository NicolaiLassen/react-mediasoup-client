import React, {createContext, createRef} from "react";
import useElementAspectRatio from "../../hooks/useElementAspectRatio";

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
                <div>
                    {children}
                </div>
            </GridContext.Provider>
        )
    }

export default VideoGrid;
