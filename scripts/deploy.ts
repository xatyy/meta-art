import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // In Hardhat 3, ethers is accessed via network.connect()
  const connection = await hre.network.connect();
  const { ethers } = connection;

  const [deployer] = await ethers.getSigners();

  console.log("Deploying MetaArt contract...");
  console.log("Network :", connection.networkName);
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance :",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH/MATIC"
  );

  const MetaArt = await ethers.getContractFactory("MetaArt");
  const metaArt = await MetaArt.deploy();
  await metaArt.waitForDeployment();

  const address = await metaArt.getAddress();
  console.log("\nMetaArt deployed to:", address);

  // Update .env with the contract address
  const envPath = path.join(__dirname, "../.env");
  let envContent = fs.readFileSync(envPath, "utf8");

  if (/^NEXT_PUBLIC_CONTRACT_ADDRESS=.*/m.test(envContent)) {
    envContent = envContent.replace(
      /^NEXT_PUBLIC_CONTRACT_ADDRESS=.*/m,
      `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`
    );
  } else {
    envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${address}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(".env updated  → NEXT_PUBLIC_CONTRACT_ADDRESS=" + address);
  console.log("\nRestart `npm run dev` for the change to take effect.");

  await connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
