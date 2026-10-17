import { Composition } from 'remotion';

import { Launch, LAUNCH_FRAMES } from './Launch';

/** LinkedIn-friendly 4:5 portrait, 30 fps, ~30 s, silent with burned-in captions. */
export const Root = () => (
  <Composition id="Launch" component={Launch} durationInFrames={LAUNCH_FRAMES} fps={30} width={1080} height={1350} />
);
