// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IMerchantRegistry
/// @notice Merchants that sell to agents register here. The hub records settlements so
///         owners can gate stipends on a merchant's track record.
interface IMerchantRegistry {
    struct Merchant {
        string name;
        string url;
        string tags; // comma separated, lowercase, e.g. "data,inference"
        uint40 registeredAt;
        uint64 settlements;
        uint128 volume; // sum of amounts across all tokens (informational)
        uint256 erc8004AgentId; // 0 when not linked
    }

    event MerchantRegistered(address indexed merchant, string name, string url, string tags);
    event MerchantUpdated(address indexed merchant, string name, string url, string tags);
    event MerchantLinkedIdentity(address indexed merchant, uint256 indexed agentId);
    event SettlementRecorded(
        address indexed merchant, address indexed token, uint128 amount, uint64 settlements
    );
    event HubUpdated(address indexed hub);
    event IdentityRegistryUpdated(address indexed registry);

    error NotHub();
    error NotRegistered();
    error AlreadyRegistered();
    error NameRequired();
    error NotIdentityOwner();

    function register(string calldata name, string calldata url, string calldata tags) external;
    function update(string calldata name, string calldata url, string calldata tags) external;
    function linkIdentity(uint256 agentId) external;
    function recordSettlement(address merchant, address token, uint128 amount) external;

    function get(address merchant) external view returns (Merchant memory);
    function isRegistered(address merchant) external view returns (bool);
    function isVerified(address merchant) external view returns (bool);
    function settlementsOf(address merchant) external view returns (uint64);
    function count() external view returns (uint256);
    function list(uint256 offset, uint256 limit) external view returns (address[] memory);
}
