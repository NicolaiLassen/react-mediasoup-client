import styled from 'styled-components';

import {VideoGridProps} from './';

export const StyledVideoGrid = styled.div<VideoGridProps>`
  height: 100%;
  width: 100%;
  position: relative;
  background: ${(props) => props.theme.colors.greys.grey100};
  inno-video {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
  }
`;