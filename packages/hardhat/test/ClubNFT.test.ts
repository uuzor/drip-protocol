import { expect } from "chai";
import { ethers } from "hardhat";

describe("ClubNFT", function () {
  async function deployClubNFTFixture() {
    const [deployer, other, matchContract, upgradeContract] = await ethers.getSigners();

    const ClubNFT = await ethers.getContractFactory("ClubNFT");
    const clubNFT = await ClubNFT.deploy("Drip Club NFT", "DCLUB");
    await clubNFT.waitForDeployment();

    const MATCH_CONTRACT_ROLE = await clubNFT.MATCH_CONTRACT_ROLE();
    const UPGRADE_CONTRACT_ROLE = await clubNFT.UPGRADE_CONTRACT_ROLE();

    await clubNFT.grantRole(MATCH_CONTRACT_ROLE, matchContract.address);
    await clubNFT.grantRole(UPGRADE_CONTRACT_ROLE, upgradeContract.address);

    return { clubNFT, deployer, other, matchContract, upgradeContract };
  }

  it("mint produces stats in the valid 10-100 range", async function () {
    const { clubNFT, other } = await deployClubNFTFixture();

    await clubNFT.connect(other).mint();

    const stats = await clubNFT.getStats(1);

    expect(stats.attack).to.be.gte(10).and.lte(100);
    expect(stats.defense).to.be.gte(10).and.lte(100);
    expect(stats.midfield).to.be.gte(10).and.lte(100);
    expect(stats.stamina).to.be.gte(10).and.lte(100);
    expect(stats.wins).to.eq(0);
    expect(stats.losses).to.eq(0);
    expect(stats.fanTokenUnlocked).to.eq(false);
  });

  it("recordMatch updates wins/losses and unlocks fan token after 10 wins", async function () {
    const { clubNFT, other, matchContract } = await deployClubNFTFixture();

    await clubNFT.connect(other).mint();

    await clubNFT.connect(matchContract).recordMatch(1, false);
    let stats = await clubNFT.getStats(1);
    expect(stats.wins).to.eq(0);
    expect(stats.losses).to.eq(1);
    expect(stats.fanTokenUnlocked).to.eq(false);

    for (let i = 0; i < 10; i++) {
      await clubNFT.connect(matchContract).recordMatch(1, true);
    }

    stats = await clubNFT.getStats(1);
    expect(stats.wins).to.eq(10);
    expect(stats.losses).to.eq(1);
    expect(stats.fanTokenUnlocked).to.eq(true);
  });

  it("role gates reject unauthorized callers", async function () {
    const { clubNFT, other } = await deployClubNFTFixture();

    await clubNFT.connect(other).mint();

    await expect(clubNFT.connect(other).recordMatch(1, true)).to.be.revertedWithCustomError(
      clubNFT,
      "AccessControlUnauthorizedAccount"
    );

    await expect(
      clubNFT.connect(other).upgradeAttribute(1, 0, other.address)
    ).to.be.revertedWithCustomError(clubNFT, "AccessControlUnauthorizedAccount");
  });
});
