// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IStipendHub
/// @notice Interface and shared types for the Stipnd hub.
interface IStipendHub {
    /// @notice How a stipend decides which merchants may be paid.
    enum MerchantMode {
        Any, // any address
        Allowlist, // only addresses explicitly allowed by the owner
        Verified, // only merchants registered in the MerchantRegistry (and ERC-8004 when configured)
        VerifiedOrAllowlist // verified merchants, plus the owner's allowlist
    }

    /// @notice Why a payment attempt was refused. Zero means the attempt was accepted.
    enum RejectReason {
        None,
        Frozen,
        Expired,
        PerCallCap,
        PeriodBudget,
        InsufficientBalance,
        RateLimit,
        DuplicateResource,
        MerchantNotAllowed,
        MerchantNotVerified,
        MerchantTooNew
    }

    /// @notice Spending rules for a stipend. All amounts are in the stipend token's smallest unit.
    struct Policy {
        uint128 periodBudget; // max spend per period
        uint32 periodLength; // seconds; 0 = single period that never refills
        uint128 perCallCap; // max per payment
        uint32 maxCallsPerWindow; // 0 = no rate limit
        uint32 rateWindow; // seconds
        uint16 maxSameResource; // 0 = no duplicate guard
        uint32 duplicateWindow; // seconds
        uint32 minMerchantSettlements; // for Verified modes: merchant must have >= this many settlements
        MerchantMode merchantMode;
        uint40 expiresAt; // 0 = never
    }

    struct Stipend {
        address owner;
        address token;
        uint128 balance;
        uint128 spentThisPeriod;
        uint40 periodStart;
        bool frozen;
        Policy policy;
        string name;
        string purpose;
    }

    /// @notice Lightweight view returned by `preview`.
    struct Preview {
        bool ok;
        RejectReason reason;
        uint128 remainingThisPeriod;
        uint128 balance;
        uint40 periodEndsAt;
    }

    event StipendCreated(
        uint256 indexed id,
        address indexed owner,
        address indexed token,
        string name,
        string purpose,
        Policy policy
    );
    event Funded(uint256 indexed id, address indexed from, uint128 amount, uint128 balance);
    event Withdrawn(uint256 indexed id, address indexed to, uint128 amount, uint128 balance);
    event Paid(
        uint256 indexed id,
        address indexed merchant,
        uint128 amount,
        bytes32 indexed resourceHash,
        string memo,
        uint128 remainingThisPeriod,
        uint128 balance
    );
    event PaymentRejected(
        uint256 indexed id,
        address indexed merchant,
        uint128 amount,
        bytes32 indexed resourceHash,
        RejectReason reason
    );
    event Frozen(uint256 indexed id, bool frozen);
    event PolicyUpdated(uint256 indexed id, Policy policy);
    event AllowlistUpdated(uint256 indexed id, address indexed merchant, bool allowed);
    event PeriodRolled(uint256 indexed id, uint40 periodStart);

    error NotOwner();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidPolicy();
    error NameTooLong();
    error UnknownStipend();

    function create(
        address token,
        string calldata name,
        string calldata purpose,
        Policy calldata policy,
        address[] calldata allowlist,
        uint128 initialFunding
    ) external returns (uint256 id);

    function fund(uint256 id, uint128 amount) external;
    function withdraw(uint256 id, uint128 amount, address to) external;
    function pay(uint256 id, address merchant, uint128 amount, bytes32 resourceHash, string calldata memo)
        external
        returns (bool accepted);
    function setFrozen(uint256 id, bool frozen) external;
    function updatePolicy(uint256 id, Policy calldata policy) external;
    function setAllowlist(uint256 id, address[] calldata merchants, bool allowed) external;

    function getStipend(uint256 id) external view returns (Stipend memory);
    function preview(uint256 id, address merchant, uint128 amount, bytes32 resourceHash)
        external
        view
        returns (Preview memory);
    function isAllowed(uint256 id, address merchant) external view returns (bool);
    function stipendsOf(address owner) external view returns (uint256[] memory);
}
