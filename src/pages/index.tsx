import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import styles from '../styles/Home.module.css';
import { MetaArtABI } from '../constants/abi';
import { useDrafts, type Draft } from '../hooks/useDrafts';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const Home: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { drafts, addDraft, markMinted, deleteDraft } = useDrafts(address);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [metadataUri, setMetadataUri] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const { writeContract, data: hash, isPending: isMinting } = useWriteContract();
  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && hash && currentDraftId) {
      markMinted(currentDraftId, hash);
    }
  }, [isSuccess, hash]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json() as { success: boolean; metadataUri?: string; imageUrl?: string; error?: string };
      if (data.success && data.metadataUri && data.imageUrl) {
        setMetadataUri(data.metadataUri);
        setImageUrl(data.imageUrl);
        const id = addDraft(prompt, data.imageUrl, data.metadataUri);
        setCurrentDraftId(id);
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

  const handleMintFromDraft = (draft: Draft) => {
    setPrompt(draft.prompt);
    setMetadataUri(draft.metadataUri);
    setImageUrl(draft.imageUrl);
    setCurrentDraftId(draft.id);
    setGenerateError('');
    resetMint();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setPrompt('');
    setMetadataUri('');
    setImageUrl('');
    setGenerateError('');
    setCurrentDraftId(null);
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

        <h1 className={styles.title}>
          Meta Art Gallery
        </h1>

        <p className={styles.description}>
          Generate AI art and mint it directly to your wallet.
        </p>

        {isConnected ? (
          <>
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
                    <a
                      href={`https://amoy.polygonscan.com/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.hashLink}
                    >
                      {hash.slice(0, 20)}...{hash.slice(-8)}
                    </a>
                  </div>
                  <button onClick={handleReset} className={styles.actionButton}>
                    Mint Another
                  </button>
                </div>
              )}
            </div>

            {/* Gallery */}
            {drafts.length > 0 && (
              <div className={styles.draftsSection}>
                <div className={styles.draftsHeader}>
                  <h2 className={styles.draftsTitle}>Your Gallery</h2>
                  <span className={styles.draftsCount}>{drafts.length} {drafts.length === 1 ? 'piece' : 'pieces'}</span>
                </div>
                <div className={styles.draftsGrid}>
                  {drafts.map(draft => (
                    <div key={draft.id} className={styles.draftCard}>
                      <div className={styles.draftImageWrapper}>
                        <Image
                          src={draft.imageUrl}
                          alt={draft.prompt}
                          width={300}
                          height={300}
                          className={styles.draftImage}
                          unoptimized
                        />
                        <span className={draft.status === 'minted' ? styles.badgeMinted : styles.badgeDraft}>
                          {draft.status === 'minted' ? '✓ Minted' : 'Draft'}
                        </span>
                      </div>
                      <div className={styles.draftInfo}>
                        <p className={styles.draftPrompt}>"{draft.prompt}"</p>
                        <div className={styles.draftFooter}>
                          <span className={styles.draftDate}>{formatDate(draft.createdAt)}</span>
                          <div className={styles.draftActions}>
                            {draft.status === 'draft' && (
                              <button
                                onClick={() => handleMintFromDraft(draft)}
                                className={styles.mintDraftButton}
                              >
                                Mint
                              </button>
                            )}
                            {draft.status === 'minted' && draft.txHash && (
                              <a
                                href={`https://amoy.polygonscan.com/tx/${draft.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.viewTxLink}
                              >
                                View Tx ↗
                              </a>
                            )}
                            <button
                              onClick={() => deleteDraft(draft.id)}
                              className={styles.deleteButton}
                              title="Remove from gallery"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p>Please connect your wallet to start generating.</p>
        )}
      </main>
    </div>
  );
};

export default Home;
