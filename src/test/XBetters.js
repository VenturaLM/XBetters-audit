const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { PANIC_CODES } = require("@nomicfoundation/hardhat-chai-matchers/panic");
const { expect } = require("chai");

describe("XBetters", function () {

    async function deploy() {
        // Contracts are deployed using the first signer/account by default
        const [owner, account1] = await ethers.getSigners();

        const Contract = await ethers.getContractFactory("XBetters");
        const contract = await Contract.deploy();

        return { contract, owner, account1 };
    }

    beforeEach(async function () {
        await loadFixture(deploy);
    });

    // =============================================================================================

    describe("setBaseURI()", function () {
        it(`Runs setBaseURI()`, async function () {
            const { contract } = await loadFixture(deploy);

            contract.setBaseURI("ipfs://placeholder/");
            const baseURI = await contract.baseURI();
            expect(baseURI).to.equal("ipfs://placeholder/");
        });
    });

    // =============================================================================================

    describe("setNotRevealedUri()", function () {
        it(`Runs setNotRevealedUri()`, async function () {
            const { contract } = await loadFixture(deploy);

            contract.setNotRevealedUri("ipfs://placeholder/");
            const notRevealedUri = await contract.notRevealedUri();
            expect(notRevealedUri).to.equal("ipfs://placeholder/");
        });
    });

    // =============================================================================================

    describe("setFiatMinter()", function () {
        it(`Runs setFiatMinter()`, async function () {
            const { contract } = await loadFixture(deploy);

            contract.setFiatMinter("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4");
            expect(await contract.getFiatMinter()).to.equal("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4");
        });
    });

    // =============================================================================================

    describe("reveal()", function () {
        it(`Runs reveal()`, async function () {
            const { contract } = await loadFixture(deploy);

            contract.reveal();

            // Variable `revealed`.
            const revealed = await contract.revealed();
            expect(revealed).to.equal(true);

            // Variable `phase`.
            const phase = await contract.phase();
            expect(phase).to.equal(5); // Phase 5 = Revealed
        });
    });

    // =============================================================================================

    describe("setPhase()", function () {
        // Valid tests case.
        it(`Runs setPhase(n). Expected: phase = n. Range [0, 5]`, async function () {
            const { contract } = await loadFixture(deploy);

            contract.setPhase(0);
            const phase = await contract.phase();
            expect(phase).to.equal(0);
        });

        // Invalid test case.
        it(`Runs setPhase() with an out-of-bounds phase. Expected: Revert with Panic error 0x21 (${PANIC_CODES.ENUM_CONVERSION_OUT_OF_BOUNDS})`, async function () {
            const { contract } = await loadFixture(deploy);

            expect(contract.setPhase(-1)).to.be.revertedWithPanic(PANIC_CODES.ENUM_CONVERSION_OUT_OF_BOUNDS);
        });
    });

    // =============================================================================================

    describe("Successful transfer functions", function () {
        it(`Runs transferFrom()`, async function () {
            const { contract, owner, account1 } = await loadFixture(deploy);

            expect(await contract.transferFrom(owner.address, account1.address, 0)).to.emit("Received"); // From, To, TokenId.
            expect(await contract.ownerOf(0)).to.equal(account1.address);
        });

        it(`Runs transferFrom() after approve()`, async function () {
            const { contract, owner, account1 } = await loadFixture(deploy);

            contract.approve(account1.address, 0); // To, TokenId.
            expect(await contract.connect(account1).transferFrom(owner.address, account1.address, 0)).to.emit("Received"); // From, To, TokenId.
            expect(await contract.ownerOf(0)).to.equal(account1.address);
        });

        it(`Runs safeTransferFrom(address,address,uint256)`, async function () {
            const { contract, owner, account1 } = await loadFixture(deploy);

            // Overloaded function.
            expect(await contract["safeTransferFrom(address,address,uint256)"](owner.address, account1.address, 0)).to.emit(contract, "Transfer"); // From, To, TokenId.
            expect(await contract.ownerOf(0)).to.equal(account1.address);
        });

        it(`Runs safeTransferFrom(address,address,uint256,bytes)`, async function () {
            const { contract, owner, account1 } = await loadFixture(deploy);

            // Overloaded function.
            expect(await contract["safeTransferFrom(address,address,uint256,bytes)"](owner.address, account1.address, 0, "0x01")).to.emit(contract, "Transfer"); // From, To, TokenId.
            expect(await contract.ownerOf(0)).to.equal(account1.address);
        });
    });

    describe("Unsuccessful transfer functions", function () {
        it(`Runs transferFrom() trying to transfer a token that does not exist in other account`, async function () {
            const { contract, owner, account1 } = await loadFixture(deploy);

            await expect(contract.transferFrom(account1.address, owner.address, 0)).to.be.revertedWithCustomError(contract, "TransferFromIncorrectOwner"); // From, To, TokenId.
            expect(await contract.ownerOf(0)).to.equal(owner.address);
        });

        it(`Runs transferFrom() without being approved for it`, async function () {
            const { contract, owner, account1 } = await loadFixture(deploy);

            await expect(contract.connect(account1).transferFrom(owner.address, account1.address, 0)).to.be.revertedWithCustomError(contract, "TransferCallerNotOwnerNorApproved"); // From, To, TokenId.
            expect(await contract.ownerOf(0)).to.equal(owner.address);
        });
    });

    // =============================================================================================

    describe("setMerkleRootA()", function () {
        const merkleRoot = "0xb12e5b97c5c34aeb22d4e5f0061100c5072c240346e4d28a1a73659930fe90b2";

        it(`Runs setMerkleRootA`, async function () {
            const { contract } = await loadFixture(deploy);

            contract.setMerkleRootA(merkleRoot);
            expect(await (contract.getMerkleRootA())).to.equal(merkleRoot);
        });
    });

    // =============================================================================================

    describe("whitelistAMint(). This function tests a Merkle Proof", function () {
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
        //       ├─ 0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9 (Index 2)
        //       └─ 0x5b1130ba602a5b64a86675b98193c8989dfff9db8956c9d2eac539828c115523 (Index 3)

        // Verify:
        //     Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        //     Hash: 0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9
        // Proof: ["0x1ebaa930b8e9130423c183bf38b0564b0103180b7dad301013b18e59880541ae", "0x343750465941b29921f50a28e0e43050e5e1c2611a3ea8d7fe1001090d5e1436"]


        // Test cases:
        const tests = [
            // Quantity, Proof, Phase, Expected value
            [1, ["0x1ebaa930b8e9130423c183bf38b0564b0103180b7dad301013b18e59880541ae", "0x343750465941b29921f50a28e0e43050e5e1c2611a3ea8d7fe1001090d5e1436"], 1, 301], // Valid
            [1, ["0x343750465941b29921f50a28e0e43050e5e1c2611a3ea8d7fe1001090d5e1436", "0x1ebaa930b8e9130423c183bf38b0564b0103180b7dad301013b18e59880541ae"], 1, "Not whitelisted"], // Invalid `Proof`
        ];

        const merkleRoot = "0xb12e5b97c5c34aeb22d4e5f0061100c5072c240346e4d28a1a73659930fe90b2";

        // Check test cases.
        for (let i = 0; i < tests.length; i++) {
            // Insert valid test cases in conditional.
            if (i == 0) {
                // Valid tests cases.
                it(`FIXME: whitelistAMint(${tests[i][0]}, [${tests[i][1]}]) - Expected: ${tests[i][3]}`, async function () {
                    const { contract, owner } = await loadFixture(deploy);

                    // Set Merkle root.
                    contract.setMerkleRootA(merkleRoot);
                    // Get Merkle root.
                    expect(await contract.getMerkleRootA()).to.equal(merkleRoot);

                    // Set phase.
                    contract.setPhase(tests[i][2]);
                    // Get variable from contract.
                    const phase = await contract.phase();
                    // Get phase.
                    expect(phase).to.equal(tests[i][2]);

                    // Mint.
                    // FIXME: Although the Merkle Proof have been proved in Remix and here in Hardhat
                    // the data have been also checked that is correctly assigned, the test does fail.
                    await expect(contract.whitelistAMint(tests[i][0], tests[i][1], { from: owner.address, value: ethers.utils.parseEther("0.12"), })).not.to.be.revertedWith("Not whitelisted");

                    // Test.
                    const tokens = await contract.tokensOfOwner(owner.address);
                    const tokenList = tokens.map(bn => bn.toNumber());

                    expect(tokenList.length).to.equal(301);
                });
            } else {
                // Invalid test cases.
                it(`whitelistAMint(${tests[i][0]}, [${tests[i][1]}]) - Expected: ${tests[i][3]}`, async function () {
                    const { contract } = await loadFixture(deploy);

                    // Set Merkle root.
                    contract.setMerkleRootA(merkleRoot);
                    // Get Merkle root.
                    expect(await (contract.getMerkleRootA())).to.equal(merkleRoot);

                    // Set phase.
                    contract.setPhase(tests[i][2]);
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

    // =============================================================================================

    describe("publicMint()", function () {
        it(`Runs publicMint()`, async function () {
            const { contract, account1 } = await loadFixture(deploy);

            contract.setPhase(3);

            const phase = await contract.phase();
            expect(phase).to.equal(3);

            await contract.connect(account1).publicMint(1, { from: account1.address, value: ethers.utils.parseEther("0.15"), });

            const tokens = await contract.tokensOfOwner(account1.address);
            const tokenList = tokens.map(bn => bn.toNumber());

            expect(tokenList.length).to.equal(1);
        });
    });

    // =============================================================================================

    describe("fiatMint()", function () {
        it(`Runs fiatMint()`, async function () {
            const { contract, account1 } = await loadFixture(deploy);

            contract.setPhase(3);

            const phase = await contract.phase();
            expect(phase).to.equal(3);

            await contract.connect(account1).fiatMint(account1.address, 1); // Account, quantity
            const tokens = await contract.tokensOfOwner(account1.address);
            const tokenList = tokens.map(bn => bn.toNumber());

            expect(tokenList.length).to.equal(1);
        });
    });

    // =============================================================================================

    describe("tokensOfOwner()", function () {
        it(`Returns a list with the tokens of the given owner`, async function () {
            const { contract, owner } = await loadFixture(deploy);

            // At deployment, the owner receives 300 giveaway tokens.
            const tokens = await contract.tokensOfOwner(owner.address);
            const tokenList = tokens.map(bn => bn.toNumber());
            expect(tokenList.length).to.equal(300);
        });
    });

    // =============================================================================================

    describe("tokenURI()", function () {
        it(`Returns the URI of a token that does exits but it is not revealed`, async function () {
            const { contract } = await loadFixture(deploy);

            const notRevealedUri = await contract.notRevealedUri();
            expect(await contract.tokenURI(0)).to.equal(notRevealedUri);
        });

        it(`Returns the URI of a token that does exits and it is revealed`, async function () {
            const { contract } = await loadFixture(deploy);

            contract.setNotRevealedUri("ipfs://placeholder/");
            const notRevealedUri = await contract.notRevealedUri();
            expect(await contract.tokenURI(0)).to.equal(notRevealedUri);
        });

        it(`Returns an error due to an attempt of getting the URI of a non-existing token`, async function () {
            const { contract } = await loadFixture(deploy);

            expect(contract.tokenURI(10000)).to.be.revertedWith("URI query for nonexistent token");
        });
    });

    // =============================================================================================

    describe("withdraw()", function () {
        it(`Test the exchange of balance among EOA and the CA`, async function () {
            const { contract, account1 } = await loadFixture(deploy);

            contract.setPhase(3);
            await contract.connect(account1).publicMint(1, { from: account1.address, value: ethers.utils.parseEther("0.15"), });

            // Check contract's balance that must be equal to the previous TX price.
            const balance = await contract.provider.getBalance(contract.address);
            const mintPrice = await contract.mintPrice();

            expect(balance).to.equal(mintPrice);
        });
    });

    // =============================================================================================

    describe("setPhaseMaxValue()", function () {

        it(`Runs setPhaseMaxValue and checks if the phase's maximum mints is properly setted`, async function () {
            const { contract } = await loadFixture(deploy);
            contract.setPhaseMaxValue(1, 5); // Phase, value
            const phase = await contract.getPhaseMaxValue(1);
            expect(phase).to.equal(5);
        });

        it(`Runs setPhaseMaxValue with an out-of-bounds phase. Expected: Revert with Panic error 0x21 (${PANIC_CODES.ENUM_CONVERSION_OUT_OF_BOUNDS})`, async function () {
            const { contract } = await loadFixture(deploy);
            expect(contract.setPhaseMaxValue(-1, 5)).to.be.revertedWithPanic(PANIC_CODES.ENUM_CONVERSION_OUT_OF_BOUNDS); // Phase, value
        });
    });

    // =============================================================================================

    describe("Mint prices", function () {
        it(`setWhitelistAMintPrice()`, async function () {
            const { contract } = await loadFixture(deploy);

            contract.setWhitelistAMintPrice(ethers.utils.parseEther("1.2"));
            mintPrice = await contract.whitelistAMintPrice();

            expect(parseFloat(ethers.utils.formatEther(mintPrice))).to.equal(1.2);
        });

        it(`setMintPrice()`, async function () {
            const { contract } = await loadFixture(deploy);

            contract.setMintPrice(ethers.utils.parseEther("3.4"));
            mintPrice = await contract.mintPrice();

            expect(parseFloat(ethers.utils.formatEther(mintPrice))).to.equal(3.4);
        });
    });
});
