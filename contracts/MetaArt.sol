// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MetaArt is ERC721 {
    uint256 private _nextTokenId;
    mapping(uint256 => string) private _tokenURIs;

    event MetaArtMinted(address indexed to, uint256 indexed tokenId, string uri);

    constructor() ERC721("MetaArt", "MART") {}

    function mint(address to, string memory uri) public {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _tokenURIs[tokenId] = uri;
        emit MetaArtMinted(to, tokenId, uri);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    function getCurrentTokenId() public view returns (uint256) {
        return _nextTokenId;
    }
}
