import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MetaArtModule", (m) => {
  const metaArt = m.contract("MetaArt");
  return { metaArt };
});