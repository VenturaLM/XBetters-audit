// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

//@author Ventura Lucena Martinez
//@title XBetters_IP
//@notice This is an improvement proposal for XBetters contract deployed here:
// https://etherscan.io/address/0xd19056371236ed978aa2e23699bb5efad0bc3566. Should still include
// NatSpec code comments.
//@dev Original contract deployment cost: 4976689 // This contract: 4793242
//
//
//                          .@@@
//                         @@@#
//                       %@@@*                                                        (@@@@@
//                      @@@@                                           ,%         @@@@@%@@@     ,@@@
//             (@.    *@@@(       (@@&             *     ,#@@@@@@@@@@@@@/         @@# @@@    @@@@
//             @@@#  @@@@    @@@@@@@@@.    (@@@@@@@@            @@@      (&@@@@,  @@@@@/   %@@@  * ..
//              @@@ @@@@  @@@@(  @@@(  .@@@@@        ,@@@@@@@@@K@@@   &@@@@      /@@@@@    ,@@@@@@@@@@
//              @@@@@@@  @@@   @@@@     #@@       @@@@@@@@     .@@@   @@@@@A    #@@ @@@%       &@@@@
//               @@@@    @@@(@@@@@@*    @@@@@@@@*      @@@     @@@  *@@@@        .@%   @@@@  #@@@&
//             &@@A@@.   @@@   .(%@@@@@N@@@            @@@     @@@   @@@        /%       @@@@@#
//            @@@&%@@@   .         ,@@@ @@@     //,    @@&     @@    @@@@@@@@@@        @@@@@@@I
//          ,@@@#  @@@@         @@@@@  /@@*@@@@@,      @@&         @@@@@@@.         &@@@     @@@
//         @@@@.    @@@#  /@@@@@@#      @@@@          @@*          (                          #@@@
//       @@@@.      @@@@@@@&,           /             #&                                         @
//      @@&     @@@@/%@@@
//    .@@@            &@@*
//   @@
//
//

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import {DefaultOperatorFilterer} from "./opensea/DefaultOperatorFilterer.sol";
import "./ERC721A.sol";
import "./Strings_IP.sol";

contract XBetters_IP is ERC721A, DefaultOperatorFilterer, Ownable {
    uint256 private constant MAX_SUPPLY = 3000;
    error NotEnoughTokensLeft();

    uint256 private maxMintsPerAddressWLA = 1000;
    uint256 private maxMintsPerAddressWLB = 1000;
    uint256 private maxMintsPerAddressPUB = 100;
    error LimitExceeded();

    uint256 public whitelistAMintPrice = 0.12 ether;
    uint256 public whitelistBMintPrice = 0.12 ether;
    uint256 public mintPrice = 0.15 ether;
    error UnsufficientEther();

    bool public revealed;

    bytes32 private merkleRootA;
    error NotWhitelistedInA();

    bytes32 private merkleRootB;
    error NotWhitelistedInB();

    // This address has been updated to Hardhat's first address in order to carry out tests.
    address private fiatMinter = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    enum Phase {
        Before,
        WhitelistA,
        WhitelistB,
        Public,
        Soldout,
        Reveal
    }

    Phase public phase;
    error WhitelistANotActive();
    error WhitelistBNotActive();
    error PublicMintNotActive();
    error InvalidPhase();
    error PhaseNotMintable();

    string public baseURI =
        "ipfs://QmTSq1ini2popkUZez3vm8qrfpcHZE33T9RNyhfgV5aA8M/";
    string public notRevealedURI =
        "ipfs://QmTSq1ini2popkUZez3vm8qrfpcHZE33T9RNyhfgV5aA8M/XB_unrevealed.json";
    error TokenDoesNotExist();

    constructor() ERC721A("XBetters", "XBET") {
        // Premint 300 tokens for the team
        _safeMint(msg.sender, 300);
    }

    // Modifiers
    // Mitigation for bots minting
    modifier callerIsUSer() {
        require(tx.origin == msg.sender, "Caller is another contract");
        _;
    }

    // Fiat mint can only be called by fiatMinter
    modifier onlyFiatMinter() {
        require(fiatMinter == msg.sender, "Caller is not minter");
        _;
    }

    // External
    function setPhase(int _phase) external onlyOwner {
        phase = Phase(_phase);
    }

    function whitelistAMint(
        uint _quantity,
        bytes32[] calldata _proof
    ) external payable callerIsUSer {
        if (phase != Phase.WhitelistA) revert WhitelistANotActive();

        if (!isWhitelistedA(msg.sender, _proof)) revert NotWhitelistedInA();

        if (_numberMinted(msg.sender) + _quantity > maxMintsPerAddressWLA)
            revert LimitExceeded();

        if (totalSupply() + _quantity > MAX_SUPPLY)
            revert NotEnoughTokensLeft();

        if (msg.value < (whitelistAMintPrice * _quantity))
            revert UnsufficientEther();

        _safeMint(msg.sender, _quantity);
    }

    function whitelistBMint(
        uint _quantity,
        bytes32[] calldata _proof
    ) external payable callerIsUSer {
        if (phase != Phase.WhitelistB) revert WhitelistBNotActive();

        if (!isWhitelistedB(msg.sender, _proof)) revert NotWhitelistedInB();

        if (_numberMinted(msg.sender) + _quantity > maxMintsPerAddressWLB)
            revert LimitExceeded();

        if (totalSupply() + _quantity > MAX_SUPPLY)
            revert NotEnoughTokensLeft();

        if (msg.value < (whitelistBMintPrice * _quantity))
            revert UnsufficientEther();

        _safeMint(msg.sender, _quantity);
    }

    function publicMint(uint _quantity) external payable callerIsUSer {
        if (phase != Phase.Public) revert PublicMintNotActive();

        if (_numberMinted(msg.sender) + _quantity > maxMintsPerAddressPUB)
            revert LimitExceeded();

        if (totalSupply() + _quantity > MAX_SUPPLY)
            revert NotEnoughTokensLeft();

        if (msg.value < (mintPrice * _quantity)) revert UnsufficientEther();

        _safeMint(msg.sender, _quantity);
    }

    function fiatMint(
        address _account,
        uint _quantity
    ) external onlyFiatMinter {
        if (phase != Phase.Public) revert PublicMintNotActive();

        if (_numberMinted(msg.sender) + _quantity > maxMintsPerAddressPUB)
            // 10
            revert LimitExceeded();

        if (totalSupply() + _quantity > MAX_SUPPLY)
            revert NotEnoughTokensLeft();

        _safeMint(_account, _quantity);
    }

    function withdraw() external payable onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function setPhaseMaxValue(
        uint256 _phase,
        uint256 _value
    ) external onlyOwner {
        if (_phase > uint8(type(Phase).max)) revert InvalidPhase();

        if (Phase(_phase) == Phase.WhitelistA) {
            maxMintsPerAddressWLA = _value;
        } else if (Phase(_phase) == Phase.WhitelistB) {
            maxMintsPerAddressWLB = _value;
        } else if (Phase(_phase) == Phase.Public) {
            maxMintsPerAddressPUB = _value;
        } else {
            revert PhaseNotMintable();
        }
    }

    // External view
    function getFiatMinter() external view onlyOwner returns (address) {
        return fiatMinter;
    }

    function getMerkleRootA() external view onlyOwner returns (bytes32) {
        return merkleRootA;
    }

    function getMerkleRootB() external view onlyOwner returns (bytes32) {
        return merkleRootB;
    }

    // External pure
    function tokensOfOwner(
        address owner
    ) external view returns (uint256[] memory) {
        unchecked {
            uint256 tokenIdsIdx;
            address currOwnershipAddr;
            uint256 tokenIdsLength = balanceOf(owner);
            uint256[] memory tokenIds = new uint256[](tokenIdsLength);
            TokenOwnership memory ownership;

            for (uint256 i; tokenIdsIdx != tokenIdsLength; ++i) {
                ownership = _ownershipAt(i);
                if (ownership.burned) {
                    continue;
                }
                if (ownership.addr != address(0)) {
                    currOwnershipAddr = ownership.addr;
                }
                if (currOwnershipAddr == owner) {
                    tokenIds[tokenIdsIdx++] = i;
                }
            }
            return tokenIds;
        }
    }

    function getPhaseMaxValue(
        uint256 _phase
    ) external view onlyOwner returns (uint256) {
        if (Phase(_phase) == Phase.WhitelistA) {
            return maxMintsPerAddressWLA;
        } else if (Phase(_phase) == Phase.WhitelistB) {
            return maxMintsPerAddressWLB;
        } else if (Phase(_phase) == Phase.Public) {
            return maxMintsPerAddressPUB;
        }

        return 0;
    }

    // Public
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setNotRevealedURI(
        string memory _newnotRevealedURI
    ) public onlyOwner {
        notRevealedURI = _newnotRevealedURI;
    }

    function setFiatMinter(address _fiatMinter) public onlyOwner {
        fiatMinter = _fiatMinter;
    }

    function reveal() public onlyOwner {
        revealed = true;
        phase = Phase.Reveal;
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public payable override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function setMerkleRootA(bytes32 _merkleRoot) public onlyOwner {
        merkleRootA = _merkleRoot;
    }

    function setMerkleRootB(bytes32 _merkleRoot) public onlyOwner {
        merkleRootB = _merkleRoot;
    }

    function setWhitelistAMintPrice(
        uint256 _whitelistAMintPrice
    ) public onlyOwner {
        whitelistAMintPrice = _whitelistAMintPrice;
    }

    function setWhitelistBMintPrice(
        uint256 _whitelistBMintPrice
    ) public onlyOwner {
        whitelistBMintPrice = _whitelistBMintPrice;
    }

    function setMintPrice(uint256 _mintPrice) public onlyOwner {
        mintPrice = _mintPrice;
    }

    // Public view
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        if (!_exists(tokenId)) {
            revert TokenDoesNotExist();
        }

        if (revealed) {
            return
                string(
                    abi.encodePacked(
                        baseURI,
                        Strings_IP.toString(tokenId),
                        ".json"
                    )
                );
        } else {
            return notRevealedURI;
        }
    }

    // Internal

    // Internal view
    function _verifyA(
        bytes32 _leaf,
        bytes32[] memory _proof
    ) internal view returns (bool) {
        return MerkleProof.verify(_proof, merkleRootA, _leaf);
    }

    function _verifyB(
        bytes32 _leaf,
        bytes32[] memory _proof
    ) internal view returns (bool) {
        return MerkleProof.verify(_proof, merkleRootB, _leaf);
    }

    function isWhitelistedA(
        address _account,
        bytes32[] calldata _proof
    ) internal view returns (bool) {
        return _verifyA(leaf(_account), _proof);
    }

    function isWhitelistedB(
        address _account,
        bytes32[] calldata _proof
    ) internal view returns (bool) {
        return _verifyB(leaf(_account), _proof);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    // Internal pure
    function leaf(address _account) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_account));
    }

    // Private
}
