import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import styles from '../styles/Home.module.css';
import { MetaArtABI } from '../constants/abi';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

const Home: NextPage = () => {
  const { address, isConnected } = useAccount();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [metadataUri, setMetadataUri] = useState('');

  const { writeContract, data: hash, isPending: isMinting } = useWriteContract();
  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.success) {
        setMetadataUri(data.metadataUri);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert("Error generating art: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMint = () => {
    if (!address || !metadataUri) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: MetaArtABI,
      functionName: 'mint',
      args: [address, metadataUri],
    });
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Meta Art Gallery</title>
        <meta content="AI Art Generator & NFT Minter" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <ConnectButton />

        <h1 className={styles.title}>
          Meta Art Gallery
        </h1>

        <p className={styles.description}>
          Generate AI art and mint it directly to your wallet.
        </p>

        {isConnected ? (
          <div className={styles.generatorBox}>
            <input
              type="text"
              placeholder="A futuristic cyber punk city..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={styles.inputField}
              disabled={isGenerating || !!metadataUri}
            />
            
            {!metadataUri ? (
              <button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt}
                className={styles.actionButton}
              >
                {isGenerating ? 'Generating Art...' : 'Generate with AI'}
              </button>
            ) : (
              <div className={styles.mintSection}>
                <p>Art Generated! URI: {metadataUri}</p>
                <button 
                  onClick={handleMint} 
                  disabled={isMinting || isWaiting}
                  className={styles.actionButton}
                >
                  {isMinting || isWaiting ? 'Minting...' : 'Mint NFT!'}
                </button>
              </div>
            )}

            {isSuccess && hash && (
               <div className={styles.successText}>
                 <p>NFT Minted Successfully!</p>
                 <p>Transaction Hash: {hash}</p>
               </div>
            )}
          </div>
        ) : (
          <p>Please connect your wallet to start generating.</p>
        )}
      </main>
    </div>
  );
};

export default Home;
