import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  polygonAmoy,
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Meta Art Gallery',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID',
  chains: [polygonAmoy],
  ssr: true,
});
