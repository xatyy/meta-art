import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, decodeEventLog } from 'viem';
import styles from '../styles/Home.module.css';
import { MetaArtABI } from '../constants/abi';
import { useDrafts, type Draft } from '../hooks/useDrafts';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const Home: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { drafts, addDraft, markMinted, markListed, markUnlisted, deleteDraft } = useDrafts(address);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [metadataUri, setMetadataUri] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const [listPrices, setListPrices] = useState<Record<string, string>>({});
  const [showListInput, setShowListInput] = useState<Record<string, boolean>>({});
  const [listingDraftId, setListingDraftId] = useState<string | null>(null);
  const [cancellingDraftId, setCancellingDraftId] = useState<string | null>(null);
  const pendingListPrice = useRef('');

  // Mint
  const { writeContract: writeMintContract, data: mintHash, isPending: isMinting, error: mintError, reset: resetMint } = useWriteContract();
  const { isLoading: isWaiting, isSuccess: isMintSuccess, data: mintReceipt } = useWaitForTransactionReceipt({ hash: mintHash });

  // List
  const { writeContract: writeListContract, data: listHash, isPending: isListPending, error: listError } = useWriteContract();
  const { isSuccess: isListSuccess } = useWaitForTransactionReceipt({ hash: listHash });

  // Cancel
  const { writeContract: writeCancelContract, data: cancelHash, isPending: isCancelPending, error: cancelError } = useWriteContract();
  const { isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });

  useEffect(() => {
    if (!isMintSuccess || !mintReceipt || !currentDraftId) return;
    let tokenId: number | undefined;
    for (const log of mintReceipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: MetaArtABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'MetaArtMinted') {
          tokenId = Number((decoded.args as { to: string; tokenId: bigint; uri: string }).tokenId);
          break;
        }
      } catch {}
    }
    markMinted(currentDraftId, mintReceipt.transactionHash, tokenId);
  }, [isMintSuccess]);

  useEffect(() => {
    if (!isListSuccess || !listHash || !listingDraftId) return;
    const draft = drafts.find((d: Draft) => d.id === listingDraftId);
    if (!draft || draft.tokenId === undefined) return;
    const priceWei = pendingListPrice.current;
    fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token_id: draft.tokenId,
        seller: address,
        price_wei: priceWei,
        image_url: draft.imageUrl,
        prompt: draft.prompt,
        metadata_uri: draft.metadataUri,
        tx_hash: listHash,
      }),
    });
    markListed(listingDraftId, priceWei);
    setListingDraftId(null);
  }, [isListSuccess]);

  useEffect(() => {
    if (!isCancelSuccess || !cancelHash || !cancellingDraftId) return;
    const draft = drafts.find((d: Draft) => d.id === cancellingDraftId);
    if (!draft || draft.tokenId === undefined) return;
    fetch('/api/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: draft.tokenId, status: 'cancelled', tx_hash: cancelHash }),
    });
    markUnlisted(cancellingDraftId);
    setCancellingDraftId(null);
  }, [isCancelSuccess]);

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
      if (data.success && data.metadataUri && data.imageUrl) {
        setMetadataUri(data.metadataUri);
        setImageUrl(data.imageUrl);
        const id = addDraft(prompt, data.imageUrl, data.metadataUri);
        setCurrentDraftId(id);
      } else {
        setGenerateError(data.error || 'Generation failed.');
      }
    } catch (e: unknown) {
      setGenerateError('Error generating art: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMint = () => {
    if (!address || !metadataUri) return;
    resetMint();
    writeMintContract({
      address: CONTRACT_ADDRESS,
      abi: MetaArtABI,
      functionName: 'mint',
      args: [address, metadataUri],
    });
  };

  const handleListForSale = (draft: Draft) => {
    const price = listPrices[draft.id];
    if (!price || parseFloat(price) <= 0 || draft.tokenId === undefined) return;
    const priceWei = parseEther(price).toString();
    pendingListPrice.current = priceWei;
    setListingDraftId(draft.id);
    writeListContract({
      address: CONTRACT_ADDRESS,
      abi: MetaArtABI,
      functionName: 'listForSale',
      args: [BigInt(draft.tokenId), parseEther(price)],
    });
  };

  const handleCancelListing = (draft: Draft) => {
    if (draft.tokenId === undefined) return;
    setCancellingDraftId(draft.id);
    writeCancelContract({
      address: CONTRACT_ADDRESS,
      abi: MetaArtABI,
      functionName: 'cancelListing',
      args: [BigInt(draft.tokenId)],
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

  const isBusy = isListPending || isCancelPending;

  return (
    <div className={styles.container}>
      <Head>
        <title>Meta Art Gallery</title>
        <meta content="AI Art Generator & NFT Minter" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <ConnectButton />
          <Link href="/marketplace" className={styles.navLink}>Marketplace</Link>
        </div>

        <h1 className={styles.title}>Meta Art Gallery</h1>
        <p className={styles.description}>Generate AI art and mint it as an NFT to your wallet.</p>

        {isConnected ? (
          <>
            <div className={styles.generatorBox}>
              {!metadataUri && (
                <>
                  <input
                    type="text"
                    placeholder="A futuristic cyberpunk city at night..."
                    value={prompt}
                    onChange={(e) => setPrompt((e.target as unknown as { value: string }).value)}
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
                    ) : 'Generate with AI'}
                  </button>
                  {generateError && <p className={styles.errorText}>{generateError}</p>}
                </>
              )}

              {metadataUri && !isMintSuccess && (
                <div className={styles.mintSection}>
                  {imageUrl && (
                    <div className={styles.imageWrapper}>
                      <Image src={imageUrl} alt={prompt} width={512} height={512} className={styles.previewImage} unoptimized />
                    </div>
                  )}
                  <p className={styles.promptLabel}>"{prompt}"</p>
                  <button onClick={handleMint} disabled={isMinting || isWaiting} className={styles.actionButton}>
                    {isMinting || isWaiting ? (
                      <span className={styles.loadingText}><span className={styles.spinner} /> Minting NFT...</span>
                    ) : 'Mint as NFT'}
                  </button>
                  {mintError && (
                    <p className={styles.errorText}>
                      Mint failed: {(mintError as { shortMessage?: string }).shortMessage ?? mintError.message}
                    </p>
                  )}
                  <button onClick={handleReset} className={styles.secondaryButton}>Start Over</button>
                </div>
              )}

              {isMintSuccess && mintHash && (
                <div className={styles.successSection}>
                  {imageUrl && (
                    <div className={styles.imageWrapper}>
                      <Image src={imageUrl} alt={prompt} width={512} height={512} className={styles.previewImage} unoptimized />
                    </div>
                  )}
                  <div className={styles.successText}>
                    <p className={styles.successTitle}>NFT Minted!</p>
                    <p className={styles.successLabel}>Transaction hash:</p>
                    <a href={`https://amoy.polygonscan.com/tx/${mintHash}`} target="_blank" rel="noopener noreferrer" className={styles.hashLink}>
                      {mintHash.slice(0, 20)}...{mintHash.slice(-8)}
                    </a>
                  </div>
                  <button onClick={handleReset} className={styles.actionButton}>Mint Another</button>
                </div>
              )}
            </div>

            {drafts.length > 0 && (
              <div className={styles.draftsSection}>
                <div className={styles.draftsHeader}>
                  <h2 className={styles.draftsTitle}>Your Gallery</h2>
                  <span className={styles.draftsCount}>{drafts.length} {drafts.length === 1 ? 'piece' : 'pieces'}</span>
                </div>
                <div className={styles.draftsGrid}>
                  {drafts.map((draft: Draft) => (
                    <div key={draft.id} className={styles.draftCard}>
                      <div className={styles.draftImageWrapper}>
                        <Image src={draft.imageUrl} alt={draft.prompt} width={300} height={300} className={styles.draftImage} unoptimized />
                        <span className={
                          draft.status === 'listed' ? styles.badgeListed :
                          draft.status === 'minted' ? styles.badgeMinted :
                          styles.badgeDraft
                        }>
                          {draft.status === 'listed'
                            ? `${formatEther(BigInt(draft.listingPrice ?? '0'))} POL`
                            : draft.status === 'minted' ? '✓ Minted' : 'Draft'}
                        </span>
                      </div>
                      <div className={styles.draftInfo}>
                        <p className={styles.draftPrompt}>"{draft.prompt}"</p>

                        {/* List price input row */}
                        {draft.status === 'minted' && draft.tokenId !== undefined && showListInput[draft.id] && (
                          <div className={styles.listInputRow}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Price in POL"
                              value={listPrices[draft.id] ?? ''}
                              onChange={e => setListPrices(p => ({ ...p, [draft.id]: (e.target as unknown as { value: string }).value }))}
                              className={styles.priceInput}
                            />
                            <button
                              onClick={() => handleListForSale(draft)}
                              disabled={isBusy || !listPrices[draft.id] || parseFloat(listPrices[draft.id]) <= 0}
                              className={styles.confirmListButton}
                            >
                              {listingDraftId === draft.id ? '...' : 'List'}
                            </button>
                          </div>
                        )}

                        {listError && listingDraftId === draft.id && (
                          <p className={styles.errorText} style={{ fontSize: '0.75rem', marginTop: 4 }}>
                            {(listError as { shortMessage?: string }).shortMessage ?? listError.message}
                          </p>
                        )}
                        {cancelError && cancellingDraftId === draft.id && (
                          <p className={styles.errorText} style={{ fontSize: '0.75rem', marginTop: 4 }}>
                            {(cancelError as { shortMessage?: string }).shortMessage ?? cancelError.message}
                          </p>
                        )}

                        <div className={styles.draftFooter}>
                          <span className={styles.draftDate}>{formatDate(draft.createdAt)}</span>
                          <div className={styles.draftActions}>
                            {draft.status === 'draft' && (
                              <button onClick={() => handleMintFromDraft(draft)} className={styles.mintDraftButton}>Mint</button>
                            )}
                            {draft.status === 'minted' && (
                              <>
                                {draft.txHash && (
                                  <a href={`https://amoy.polygonscan.com/tx/${draft.txHash}`} target="_blank" rel="noopener noreferrer" className={styles.viewTxLink}>
                                    View Tx ↗
                                  </a>
                                )}
                                {draft.tokenId !== undefined && (
                                  <button
                                    onClick={() => setShowListInput(p => ({ ...p, [draft.id]: !p[draft.id] }))}
                                    disabled={isBusy}
                                    className={styles.listButton}
                                  >
                                    {showListInput[draft.id] ? 'Cancel' : 'List'}
                                  </button>
                                )}
                              </>
                            )}
                            {draft.status === 'listed' && (
                              <button
                                onClick={() => handleCancelListing(draft)}
                                disabled={isBusy}
                                className={styles.cancelListButton}
                              >
                                {cancellingDraftId === draft.id ? '...' : 'Unlist'}
                              </button>
                            )}
                            <button onClick={() => deleteDraft(draft.id)} className={styles.deleteButton} title="Remove from gallery">×</button>
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
          <p className={styles.connectPrompt}>Connect your wallet to start generating.</p>
        )}
      </main>
    </div>
  );
};

export default Home;
