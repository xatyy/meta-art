// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MetaArt is ERC721 {
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => Listing) public listings;

    event MetaArtMinted(address indexed to, uint256 indexed tokenId, string uri);
    event Listed(address indexed seller, uint256 indexed tokenId, uint256 price);
    event Sold(address indexed seller, address indexed buyer, uint256 indexed tokenId, uint256 price);
    event ListingCancelled(address indexed seller, uint256 indexed tokenId);

    constructor() ERC721("MetaArt", "MART") {}

    function mint(address to, string memory uri) public {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _tokenURIs[tokenId] = uri;
        emit MetaArtMinted(to, tokenId, uri);
    }

    function listForSale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(price > 0, "Price must be > 0");
        _transfer(msg.sender, address(this), tokenId);
        listings[tokenId] = Listing(msg.sender, price, true);
        emit Listed(msg.sender, tokenId, price);
    }

    function buy(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        require(listing.active, "Not listed for sale");
        require(msg.value >= listing.price, "Insufficient payment");
        delete listings[tokenId];
        _transfer(address(this), msg.sender, tokenId);
        payable(listing.seller).transfer(listing.price);
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
        emit Sold(listing.seller, msg.sender, tokenId, listing.price);
    }

    function cancelListing(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(listing.seller == msg.sender, "Not seller");
        delete listings[tokenId];
        _transfer(address(this), msg.sender, tokenId);
        emit ListingCancelled(msg.sender, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    function getCurrentTokenId() public view returns (uint256) {
        return _nextTokenId;
    }
}
