import {RefObject, useState} from "react";

export type AspectRatio =
    | '21x9'
    | '16x9'
    | '3x2'
    | '4x3'
    | '1x1'
    | '2x3'
    | '1x2'
    | 'slim';


export const useElementAspectRatio = (
    ref: RefObject<HTMLElement>
): AspectRatio | null => {
    const [ratio, setRatio] = useState<AspectRatio | null>(null);

    return '21x9';
};

export default useElementAspectRatio;