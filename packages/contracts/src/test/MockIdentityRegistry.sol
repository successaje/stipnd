// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Minimal stand-in for the ERC-8004 IdentityRegistry (an ERC-721) for local testing.
contract MockIdentityRegistry is ERC721 {
    uint256 public nextId = 1;

    constructor() ERC721("Agent Identity", "AGENT") {}

    function register(address to) external returns (uint256 id) {
        id = nextId++;
        _mint(to, id);
    }
}
