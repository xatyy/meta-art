import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
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
  const [imageUrl, setImageUrl] = useState('');
  const [generateError, setGenerateError] = useState('');

  const {
    writeContract,
    data: hash,
    isPending: isMinting,
    error: mintError,
    reset: resetMint,
  } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGenerateError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json() as { success: boolean; metadataUri?: string; imageUrl?: string; error?: string };
      if (data.success) {
        setMetadataUri(data.metadataUri ?? '');
        setImageUrl(data.imageUrl ?? '');
      } else {
        setGenerateError(data.error || 'Generation failed.');
      }
    } catch (e: any) {
      setGenerateError('Error generating art: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMint = () => {
    if (!address || !metadataUri) return;
    resetMint();
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: MetaArtABI,
      functionName: 'mint',
      args: [address, metadataUri],
    });
  };

  const handleReset = () => {
    setPrompt('');
    setMetadataUri('');
    setImageUrl('');
    setGenerateError('');
    resetMint();
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

        <h1 className={styles.title}>Meta Art Gallery</h1>
        <p className={styles.description}>Generate AI art and mint it as an NFT to your wallet.</p>

        {isConnected ? (
          <div className={styles.generatorBox}>
            {/* Step 1 – Prompt input */}
            {!metadataUri && (
              <>
                <input
                  type="text"
                  placeholder="A futuristic cyberpunk city at night..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  className={styles.inputField}
                  disabled={isGenerating}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className={styles.actionButton}
                >
                  {isGenerating ? (
                    <span className={styles.loadingText}>
                      <span className={styles.spinner} /> Generating Art...
                    </span>
                  ) : (
                    'Generate with AI'
                  )}
                </button>
                {generateError && <p className={styles.errorText}>{generateError}</p>}
              </>
            )}

            {/* Step 2 – Preview & Mint */}
            {metadataUri && !isSuccess && (
              <div className={styles.mintSection}>
                {imageUrl && (
                  <div className={styles.imageWrapper}>
                    <Image
                      src={imageUrl}
                      alt={prompt}
                      width={512}
                      height={512}
                      className={styles.previewImage}
                      unoptimized
                    />
                  </div>
                )}
                <p className={styles.promptLabel}>"{prompt}"</p>
                <button
                  onClick={handleMint}
                  disabled={isMinting || isWaiting}
                  className={styles.actionButton}
                >
                  {isMinting || isWaiting ? (
                    <span className={styles.loadingText}>
                      <span className={styles.spinner} /> Minting NFT...
                    </span>
                  ) : (
                    'Mint as NFT'
                  )}
                </button>
                {mintError && (
                  <p className={styles.errorText}>
                    Mint failed: {(mintError as any).shortMessage ?? mintError.message}
                  </p>
                )}
                <button onClick={handleReset} className={styles.secondaryButton}>
                  Start Over
                </button>
              </div>
            )}

            {/* Step 3 – Success */}
            {isSuccess && hash && (
              <div className={styles.successSection}>
                {imageUrl && (
                  <div className={styles.imageWrapper}>
                    <Image
                      src={imageUrl}
                      alt={prompt}
                      width={512}
                      height={512}
                      className={styles.previewImage}
                      unoptimized
                    />
                  </div>
                )}
                <div className={styles.successText}>
                  <p className={styles.successTitle}>NFT Minted!</p>
                  <p className={styles.successLabel}>Transaction hash:</p>
                  <p className={styles.hashText}>{hash}</p>
                </div>
                <button onClick={handleReset} className={styles.actionButton}>
                  Mint Another
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className={styles.connectPrompt}>Connect your wallet to start generating.</p>
        )}
      </main>
    </div>
  );
};

export default Home;
