require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "key";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  gasReporter: {
    enabled: true,
    // outputFile: "gas_report.txt",
    noColors: true,
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
    // token: "MATIC", // See options here: https://www.npmjs.com/package/hardhat-gas-reporter
  }
};
