import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import fs from "node:fs";
import path from "node:path";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployment = await deploy("ClubNFT", {
    from: deployer,
    args: ["Drip Club NFT", "DCLUB"],
    log: true,
    autoMine: true,
  });

  if (hre.network.name === "arbitrumSepolia") {
    const filePath = path.resolve(__dirname, "../../../deployments/arbitrumSepolia.json");
    const existing = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, "utf8"))
      : {};

    const updated = {
      ...existing,
      ClubNFT: deployment.address,
      updatedAt: new Date().toISOString(),
    };

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + "\n");
  }
};

export default func;
func.tags = ["ClubNFT"];
