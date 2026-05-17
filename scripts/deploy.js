const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const NeckKnightXP = await hre.ethers.getContractFactory("NeckKnightXP");
  const token = await NeckKnightXP.deploy();

  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("Neck Knight XP token deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
