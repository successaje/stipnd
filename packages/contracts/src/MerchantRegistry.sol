// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IMerchantRegistry} from "./interfaces/IMerchantRegistry.sol";

/// @title MerchantRegistry
/// @notice Public directory of merchants that accept Stipnd payments, with a settlement
///         track record maintained by the hub. Optionally requires an ERC-8004 identity
///         for a merchant to count as "verified".
contract MerchantRegistry is IMerchantRegistry, Ownable {
    /// @notice The hub allowed to record settlements.
    address public hub;

    /// @notice ERC-8004 IdentityRegistry (an ERC-721). Zero disables the identity requirement.
    address public identityRegistry;

    mapping(address => Merchant) private _merchants;
    address[] private _index;

    constructor(address owner_, address identityRegistry_) Ownable(owner_) {
        identityRegistry = identityRegistry_;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setHub(address hub_) external onlyOwner {
        hub = hub_;
        emit HubUpdated(hub_);
    }

    function setIdentityRegistry(address registry) external onlyOwner {
        identityRegistry = registry;
        emit IdentityRegistryUpdated(registry);
    }

    // ---------------------------------------------------------------------
    // Merchant self-service
    // ---------------------------------------------------------------------

    function register(string calldata name, string calldata url, string calldata tags) external {
        if (bytes(name).length == 0) revert NameRequired();
        Merchant storage m = _merchants[msg.sender];
        if (m.registeredAt != 0) revert AlreadyRegistered();
        m.name = name;
        m.url = url;
        m.tags = tags;
        m.registeredAt = uint40(block.timestamp);
        _index.push(msg.sender);
        emit MerchantRegistered(msg.sender, name, url, tags);
    }

    function update(string calldata name, string calldata url, string calldata tags) external {
        if (bytes(name).length == 0) revert NameRequired();
        Merchant storage m = _merchants[msg.sender];
        if (m.registeredAt == 0) revert NotRegistered();
        m.name = name;
        m.url = url;
        m.tags = tags;
        emit MerchantUpdated(msg.sender, name, url, tags);
    }

    /// @notice Link an ERC-8004 agent identity owned by the caller.
    function linkIdentity(uint256 agentId) external {
        Merchant storage m = _merchants[msg.sender];
        if (m.registeredAt == 0) revert NotRegistered();
        if (identityRegistry != address(0) && IERC721(identityRegistry).ownerOf(agentId) != msg.sender) {
            revert NotIdentityOwner();
        }
        m.erc8004AgentId = agentId;
        emit MerchantLinkedIdentity(msg.sender, agentId);
    }

    // ---------------------------------------------------------------------
    // Hub hook
    // ---------------------------------------------------------------------

    function recordSettlement(address merchant, address token, uint128 amount) external {
        if (msg.sender != hub) revert NotHub();
        Merchant storage m = _merchants[merchant];
        // Unregistered merchants still accumulate a record so that registering later
        // does not erase history.
        unchecked {
            m.settlements += 1;
            m.volume += amount;
        }
        emit SettlementRecorded(merchant, token, amount, m.settlements);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function get(address merchant) external view returns (Merchant memory) {
        return _merchants[merchant];
    }

    function isRegistered(address merchant) public view returns (bool) {
        return _merchants[merchant].registeredAt != 0;
    }

    /// @notice Registered, and holding an ERC-8004 identity when a registry is configured.
    function isVerified(address merchant) public view returns (bool) {
        if (!isRegistered(merchant)) return false;
        if (identityRegistry == address(0)) return true;
        return IERC721(identityRegistry).balanceOf(merchant) > 0;
    }

    function settlementsOf(address merchant) external view returns (uint64) {
        return _merchants[merchant].settlements;
    }

    function count() external view returns (uint256) {
        return _index.length;
    }

    function list(uint256 offset, uint256 limit) external view returns (address[] memory out) {
        uint256 n = _index.length;
        if (offset >= n) return new address[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        out = new address[](end - offset);
        for (uint256 i = offset; i < end; ++i) {
            out[i - offset] = _index[i];
        }
    }
}
