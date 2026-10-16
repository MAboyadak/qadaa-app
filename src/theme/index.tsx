import { useColorScheme } from 'react-native';

import { palette, type Colors } from './tokens';

export * from './tokens';

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}
