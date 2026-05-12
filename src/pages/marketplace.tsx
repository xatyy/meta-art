import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MetaArtABI } from '../constants/abi';
import styles from '../styles/Marketplace.module.css';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

interface Listing {
  token_id: number;
  seller: string;
  price_wei: string;
  image_url: string;
  prompt: string;
  tx_hash: string;
  created_at: string;
}

const Marketplace: NextPage = () => {
  const { address, isConnected } = useAccount();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingTokenId, setBuyingTokenId] = useState<number | null>(null);
  const [buySuccess, setBuySuccess] = useState<number | null>(null);

  const { writeContract, data: buyHash, isPending: isBuying, error: buyError } = useWriteContract();
  const { isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash });

  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/listings');
      const data = await res.json();
      if (Array.isArray(data)) setListings(data as Listing[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadListings(); }, []);

  useEffect(() => {
    if (!isBuySuccess || !buyHash || buyingTokenId === null) return;
    fetch('/api/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: buyingTokenId, status: 'sold', tx_hash: buyHash }),
    });
    setBuySuccess(buyingTokenId);
    setBuyingTokenId(null);
    loadListings();
  }, [isBuySuccess]);

  const handleBuy = (listing: Listing) => {
    setBuyingTokenId(listing.token_id);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: MetaArtABI,
      functionName: 'buy',
      args: [BigInt(listing.token_id)],
      value: BigInt(listing.price_wei),
    });
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Marketplace — Meta Art Gallery</title>
        <meta content="Browse and buy AI-generated NFTs" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <ConnectButton />
          <Link href="/" className={styles.navLink}>← My Gallery</Link>
        </div>

        <h1 className={styles.title}>Marketplace</h1>
        <p className={styles.description}>Buy AI-generated NFTs listed by other creators.</p>

        {loading ? (
          <p className={styles.emptyText}>Loading listings...</p>
        ) : listings.length === 0 ? (
          <p className={styles.emptyText}>No active listings yet. List one of your NFTs from the gallery!</p>
        ) : (
          <div className={styles.grid}>
            {listings.map(listing => {
              const isOwn = address?.toLowerCase() === listing.seller.toLowerCase();
              const isBuyingThis = buyingTokenId === listing.token_id;
              const justBought = buySuccess === listing.token_id;

              return (
                <div key={listing.token_id} className={styles.card}>
                  <div className={styles.imageWrapper}>
                    <Image
                      src={listing.image_url}
                      alt={listing.prompt}
                      width={300}
                      height={300}
                      className={styles.image}
                      unoptimized
                    />
                  </div>
                  <div className={styles.info}>
                    <p className={styles.prompt}>"{listing.prompt}"</p>
                    <div className={styles.priceRow}>
                      <span className={styles.price}>
                        {formatEther(BigInt(listing.price_wei))} POL
                      </span>
                      <span className={styles.seller}>
                        {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                      </span>
                    </div>

                    {justBought ? (
                      <div className={styles.successBanner}>NFT purchased!</div>
                    ) : isOwn ? (
                      <p className={styles.ownLabel}>Your listing</p>
                    ) : isConnected ? (
                      <>
                        <button
                          onClick={() => handleBuy(listing)}
                          disabled={isBuying}
                          className={styles.buyButton}
                        >
                          {isBuyingThis ? (
                            <span className={styles.loadingText}>
                              <span className={styles.spinner} /> Buying...
                            </span>
                          ) : `Buy for ${formatEther(BigInt(listing.price_wei))} POL`}
                        </button>
                        {buyError && isBuyingThis && (
                          <p className={styles.errorText}>
                            {(buyError as { shortMessage?: string }).shortMessage ?? buyError.message}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className={styles.connectPrompt}>Connect wallet to buy</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Marketplace;
