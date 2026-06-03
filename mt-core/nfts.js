const nfts = {}; // tokenId -> { owner, metadata }

function mintNFT({ tokenId, owner, metadata }) {
  if (nfts[tokenId]) {
    throw new Error('NFT already exists');
  }

  nfts[tokenId] = {
    owner,
    metadata,
  };
}

function transferNFT({ tokenId, from, to }) {
  const nft = nfts[tokenId];
  if (!nft) throw new Error('NFT not found');
  if (nft.owner !== from) throw new Error('Not owner');

  nft.owner = to;
}

function getNFT(tokenId) {
  return nfts[tokenId];
}

function getNFTsByOwner(owner) {
  return Object.entries(nfts)
    .filter(([_, nft]) => nft.owner === owner)
    .map(([id, nft]) => ({ tokenId: id, ...nft }));
}

module.exports = {
  mintNFT,
  transferNFT,
  getNFT,
  getNFTsByOwner,
  nfts,
};
