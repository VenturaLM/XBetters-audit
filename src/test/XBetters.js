const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { PANIC_CODES } = require("@nomicfoundation/hardhat-chai-matchers/panic");
const { expect } = require("chai");
const { utils } = require("ethers");

describe("XBetters", function () {

    async function deploy() {
        // Contracts are deployed using the first signer/account by default
        const [owner, addr1] = await ethers.getSigners();

        const Contract = await ethers.getContractFactory("XBetters");
        const contract = await Contract.deploy();

        return { contract, owner, addr1 };
    }

    beforeEach(async function () {
        await loadFixture(deploy);
    });

    // =============================================================================================
    describe("setPhase()", function () {
        // Test cases:
        const tests = [0, 1, 5, -1, 7, "a"];

        // Check test cases.
        for (let i = 0; i < tests.length; i++) {
            if (tests[i] >= 0 && tests[i] < 6) {
                // Valid tests cases.
                it(`setPhase(${tests[i]}) - Expected: phase=${tests[i]}`, async function () {
                    const { contract } = await loadFixture(deploy);

                    // Set phase.
                    expect(contract.setPhase(tests[i]));

                    // Get variable from contract.
                    const phase = await contract.phase();
                    // Test.
                    expect(phase).to.equal(tests[i]);
                });
            } else {
                // Invalid test cases.
                it(`setPhase(${tests[i]}) - Expected: Revert with Panic error 0x21 (${PANIC_CODES.ENUM_CONVERSION_OUT_OF_BOUNDS})`, async function () {
                    const { contract } = await loadFixture(deploy);

                    expect(contract.setPhase(tests[i])).to.be.revertedWithPanic(PANIC_CODES.ENUM_CONVERSION_OUT_OF_BOUNDS);
                });
            }
        }
    });

    // =============================================================================================

    describe("whitelistAMint()", function () {
        // Test cases:
        const tests = [
            // Quantity, Proof, Phase, Expected value
            [7, ["0x1ebaa930b8e9130423c183bf38b0564b0103180b7dad301013b18e59880541ae", "0x343750465941b29921f50a28e0e43050e5e1c2611a3ea8d7fe1001090d5e1436"], 1, 10], // Valid
            [7, ["0x343750465941b29921f50a28e0e43050e5e1c2611a3ea8d7fe1001090d5e1436", "0x1ebaa930b8e9130423c183bf38b0564b0103180b7dad301013b18e59880541ae"], 1, "Not whitelisted"], // Invalid `Proof`
        ];

        const merkleRoot = "0xb12e5b97c5c34aeb22d4e5f0061100c5072c240346e4d28a1a73659930fe90b2";

        // Check test cases.
        for (let i = 0; i < tests.length; i++) {
            if (i == 0) {
                // Valid tests cases.
                it(`whitelistAMint(${tests[i][0]}, [${tests[i][1]}]) - Expected: ${tests[i][3]}`, async function () {
                    const { contract, owner } = await loadFixture(deploy);

                    // Set Merkle root.
                    expect(contract.setMerkleRootA(merkleRoot));
                    // Get Merkle root.
                    expect(await (contract.getMerkleRootA())).to.equal(merkleRoot);

                    // Set phase.
                    expect(contract.setPhase(tests[i][2]));
                    // Get variable from contract.
                    const phase = await contract.phase();
                    // Get phase.
                    expect(phase).to.equal(tests[i][2]);

                    // Mint.
                    console.log(owner.address);
                    await expect(contract.connect(owner).whitelistAMint(tests[i][0], tests[i][1])).not.to.be.revertedWith("Not whitelisted");
                    console.log(await (contract.totalSupply()));

                    // Test.
                    const tokens = await contract.tokensOfOwner(owner.address);
                    const tokenList = tokens.map(bn => bn.toNumber());

                    expect(tokenList.length).to.equal(10);
                });
            } else {
                // Invalid test cases.
                it(`whitelistAMint(${tests[i][0]}, [${tests[i][1]}]) - Expected: ${tests[i][3]}`, async function () {
                    const { contract } = await loadFixture(deploy);

                    // Set Merkle root.
                    expect(contract.setMerkleRootA(merkleRoot));
                    // Get Merkle root.
                    expect(await (contract.getMerkleRootA())).to.equal(merkleRoot);

                    // Set phase.
                    expect(contract.setPhase(tests[i][2]));
                    // Get variable from contract.
                    const phase = await contract.phase();
                    // Get phase.
                    expect(phase).to.equal(tests[i][2]);

                    // Mint.
                    await expect(contract.whitelistAMint(tests[i][0], tests[i][1])).to.be.revertedWith(tests[i][3]);
                });
            }
        }
    });
});
