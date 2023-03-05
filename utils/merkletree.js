const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

let whiteList = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
];

const leafNodes = whiteList.map(addr => keccak256(addr));
const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

console.log("WhitelistA Merkle Tree:\n", merkleTree.toString());

// WhitelistA Merkle Tree:
//  └─ 0xb12e5b97c5c34aeb22d4e5f0061100c5072c240346e4d28a1a73659930fe90b2 (Root)
//    ├─ 0x343750465941b29921f50a28e0e43050e5e1c2611a3ea8d7fe1001090d5e1436 (Index 4)
//    │  ├─ 0x00314e565e0574cb412563df634608d76f5c59d9f817e85966100ec1d48005c0 (Index 0)
//    │  └─ 0x8a3552d60a98e0ade765adddad0a2e420ca9b1eef5f326ba7ab860bb4ea72c94 (Index 1)
//    └─ 0x5b1130ba602a5b64a86675b98193c8989dfff9db8956c9d2eac539828c115523 (Index 5)
//       ├─ 0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9 (Index 2)
//       └─ 0x1ebaa930b8e9130423c183bf38b0564b0103180b7dad301013b18e59880541ae (Index 3)