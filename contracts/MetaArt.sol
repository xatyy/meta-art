// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract MetaArt is ERC721URIStorage {
    uint256 private _nextTokenId;

    event MetaArtMinted(address indexed to, uint256 indexed tokenId, string uri);

    constructor() ERC721("MetaArt", "MART") {}

    function mint(address to, string memory uri) public {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit MetaArtMinted(to, tokenId, uri);
    }

    function getCurrentTokenId() public view returns (uint256) {
        return _nextTokenId;
    }
}