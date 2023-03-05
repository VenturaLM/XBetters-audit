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
        //Merkle Tree:

        // Addresses = [
        //     0x70997970C51812dc3A010C7d01b50e0d17dc79C8
        //     0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
        //     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        //     0x90F79bf6EB2c4f870365E785982E1f101E93b906
        // ];

        // WhitelistA Merkle Tree:
        // └─ 0xb12e5b97c5c34aeb22d4e5f0061100c5072c240346e4d28a1a73659930fe90b2 (Root)
        //    ├─ 0x343750465941b29921f50a28e0e43050e5e1c2611a3ea8d7fe1001090d5e1436 (Index 4)
        //    │  ├─ 0x00314e565e0574cb412563df634608d76f5c59d9f817e85966100ec1d48005c0 (Index 0)
        //    │  └─ 0x8a3552d60a98e0ade765adddad0a2e420ca9b1eef5f326ba7ab860bb4ea72c94 (Index 1)
        //    └─ 0x8393e82ea28dfe71f8a1bfc8bfbe85da65aa4a7f2ceb7b2e356854fb5983c538 (Index 5)
        //        ├─ 0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9 (Index 2)
        //        └─ 0x5b1130ba602a5b64a86675b98193c8989dfff9db8956c9d2eac539828c115523 (Index 3)

        // Verify:
        //     Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        //     Hash: 0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9
        // Proof: ["0x1ebaa930b8e9130423c183bf38b0564b0103180b7dad301013b18e59880541ae", "0x343750465941b29921f50a28e0e43050e5e1c2611a3ea8d7fe1001090d5e1436"]


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
