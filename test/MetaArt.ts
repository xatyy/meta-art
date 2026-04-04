import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("MetaArt", function () {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const metaArt = await ethers.deployContract("MetaArt");
    return { metaArt, owner, otherAccount };
  }

  it("Should mint an NFT and set its URI", async function () {
    const { metaArt, otherAccount } = await deployFixture();

    const uri = "ipfs://QmTestHash123456789";
    const tx = await metaArt.connect(otherAccount).mint(otherAccount.address, uri);

    await expect(tx)
      .to.emit(metaArt, "MetaArtMinted")
      .withArgs(otherAccount.address, 0n, uri);

    expect(await metaArt.ownerOf(0)).to.equal(otherAccount.address);
    expect(await metaArt.tokenURI(0)).to.equal(uri);
  });
});
