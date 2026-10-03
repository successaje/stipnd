// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStipendHub} from "./interfaces/IStipendHub.sol";
import {IMerchantRegistry} from "./interfaces/IMerchantRegistry.sol";

/// @title StipendHub
/// @notice Holds stipends: budgeted pools of an ERC-20 that an owner's account may spend
///         only within a policy the contract enforces. Designed to be called from a smart
///         account whose session key is restricted (by the account's own permission layer)
///         to `pay` for a single stipend id. The hub does not care which key signed; it
///         enforces the stipend's rules for every call.
///
/// Invariants
///  - `balance` of a stipend never exceeds tokens deposited minus tokens paid out or withdrawn.
///  - `spentThisPeriod <= policy.periodBudget` at all times after a successful `pay`.
///  - A frozen or expired stipend never pays.
///  - Only the owner can fund-withdraw, freeze, change policy, or change the allowlist.
///  - Policy rejections inside `pay` do not revert: they emit `PaymentRejected` and return false,
///    so a rejected attempt is itself a receipt the owner can see.
contract StipendHub is IStipendHub, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_NAME_BYTES = 64;
    uint256 public constant MAX_PURPOSE_BYTES = 160;
    uint256 public constant MAX_MEMO_BYTES = 96;

    IMerchantRegistry public immutable registry;

    uint256 public nextId = 1;

    mapping(uint256 => Stipend) private _stipends;
    mapping(address => uint256[]) private _owned;
    mapping(uint256 => mapping(address => bool)) private _allowlist;

    struct Window {
        uint40 start;
        uint32 count;
    }

    // rate limiting: fixed window per stipend
    mapping(uint256 => Window) private _rate;
    // duplicate guard: fixed window per (stipend, resource)
    mapping(uint256 => mapping(bytes32 => Window)) private _dupes;

    constructor(IMerchantRegistry registry_) {
        registry = registry_;
    }

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyStipendOwner(uint256 id) {
        Stipend storage s = _stipends[id];
        if (s.owner == address(0)) revert UnknownStipend();
        if (s.owner != msg.sender) revert NotOwner();
        _;
    }

    // ---------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------

    /// @inheritdoc IStipendHub
    function create(
        address token,
        string calldata name,
        string calldata purpose,
        Policy calldata policy,
        address[] calldata allowlist,
        uint128 initialFunding
    ) external nonReentrant returns (uint256 id) {
        if (token == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0 || bytes(name).length > MAX_NAME_BYTES) revert NameTooLong();
        if (bytes(purpose).length > MAX_PURPOSE_BYTES) revert NameTooLong();
        _validatePolicy(policy);

        id = nextId++;
        Stipend storage s = _stipends[id];
        s.owner = msg.sender;
        s.token = token;
        s.periodStart = uint40(block.timestamp);
        s.policy = policy;
        s.name = name;
        s.purpose = purpose;
        _owned[msg.sender].push(id);

        emit StipendCreated(id, msg.sender, token, name, purpose, policy);

        for (uint256 i = 0; i < allowlist.length; ++i) {
            if (allowlist[i] == address(0)) revert ZeroAddress();
            _allowlist[id][allowlist[i]] = true;
            emit AllowlistUpdated(id, allowlist[i], true);
        }

        if (initialFunding > 0) {
            _fund(id, s, initialFunding);
        }
    }

    /// @inheritdoc IStipendHub
    function fund(uint256 id, uint128 amount) external nonReentrant {
        Stipend storage s = _stipends[id];
        if (s.owner == address(0)) revert UnknownStipend();
        if (amount == 0) revert ZeroAmount();
        _fund(id, s, amount);
    }

    function _fund(uint256 id, Stipend storage s, uint128 amount) private {
        IERC20 token = IERC20(s.token);
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - before;
        s.balance += uint128(received);
        emit Funded(id, msg.sender, uint128(received), s.balance);
    }

    /// @inheritdoc IStipendHub
    function withdraw(uint256 id, uint128 amount, address to) external nonReentrant onlyStipendOwner(id) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        Stipend storage s = _stipends[id];
        if (amount > s.balance) revert ZeroAmount();
        s.balance -= amount;
        IERC20(s.token).safeTransfer(to, amount);
        emit Withdrawn(id, to, amount, s.balance);
    }

    /// @inheritdoc IStipendHub
    function setFrozen(uint256 id, bool frozen) external onlyStipendOwner(id) {
        _stipends[id].frozen = frozen;
        emit Frozen(id, frozen);
    }

    /// @inheritdoc IStipendHub
    function updatePolicy(uint256 id, Policy calldata policy) external onlyStipendOwner(id) {
        _validatePolicy(policy);
        Stipend storage s = _stipends[id];
        // A new policy starts a fresh period so budget semantics are unambiguous.
        s.policy = policy;
        s.periodStart = uint40(block.timestamp);
        s.spentThisPeriod = 0;
        emit PolicyUpdated(id, policy);
        emit PeriodRolled(id, s.periodStart);
    }

    /// @inheritdoc IStipendHub
    function setAllowlist(uint256 id, address[] calldata merchants, bool allowed)
        external
        onlyStipendOwner(id)
    {
        for (uint256 i = 0; i < merchants.length; ++i) {
            if (merchants[i] == address(0)) revert ZeroAddress();
            _allowlist[id][merchants[i]] = allowed;
            emit AllowlistUpdated(id, merchants[i], allowed);
        }
    }

    // ---------------------------------------------------------------------
    // Payment
    // ---------------------------------------------------------------------

    /// @inheritdoc IStipendHub
    /// @dev Reverts only for malformed input or a non-owner caller. Every policy failure
    ///      is reported through `PaymentRejected` and a `false` return so the attempt is
    ///      visible to the owner as a receipt.
    function pay(uint256 id, address merchant, uint128 amount, bytes32 resourceHash, string calldata memo)
        external
        nonReentrant
        onlyStipendOwner(id)
        returns (bool accepted)
    {
        if (merchant == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (bytes(memo).length > MAX_MEMO_BYTES) revert NameTooLong();

        Stipend storage s = _stipends[id];
        _rollPeriod(id, s);

        RejectReason reason = _check(id, s, merchant, amount, resourceHash);
        if (reason != RejectReason.None) {
            emit PaymentRejected(id, merchant, amount, resourceHash, reason);
            return false;
        }

        // effects
        s.spentThisPeriod += amount;
        s.balance -= amount;
        _bump(_rate[id], s.policy.rateWindow);
        if (s.policy.maxSameResource != 0) {
            _bump(_dupes[id][resourceHash], s.policy.duplicateWindow);
        }

        // interactions
        IERC20(s.token).safeTransfer(merchant, amount);
        if (address(registry) != address(0)) {
            registry.recordSettlement(merchant, s.token, amount);
        }

        emit Paid(
            id, merchant, amount, resourceHash, memo, s.policy.periodBudget - s.spentThisPeriod, s.balance
        );
        return true;
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @inheritdoc IStipendHub
    function getStipend(uint256 id) external view returns (Stipend memory) {
        return _stipends[id];
    }

    /// @inheritdoc IStipendHub
    function isAllowed(uint256 id, address merchant) external view returns (bool) {
        return _allowlist[id][merchant];
    }

    /// @inheritdoc IStipendHub
    function stipendsOf(address owner) external view returns (uint256[] memory) {
        return _owned[owner];
    }

    /// @inheritdoc IStipendHub
    /// @dev Simulates period roll-over so the answer matches what `pay` would do now.
    function preview(uint256 id, address merchant, uint128 amount, bytes32 resourceHash)
        external
        view
        returns (Preview memory p)
    {
        Stipend storage s = _stipends[id];
        if (s.owner == address(0)) revert UnknownStipend();

        uint128 spent = s.spentThisPeriod;
        uint40 periodStart = s.periodStart;
        if (s.policy.periodLength != 0 && block.timestamp >= periodStart + s.policy.periodLength) {
            spent = 0;
            uint256 elapsed = (block.timestamp - periodStart) / s.policy.periodLength;
            periodStart = uint40(periodStart + elapsed * s.policy.periodLength);
        }

        p.balance = s.balance;
        p.remainingThisPeriod = s.policy.periodBudget > spent ? s.policy.periodBudget - spent : 0;
        p.periodEndsAt = s.policy.periodLength == 0 ? 0 : periodStart + s.policy.periodLength;

        if (amount == 0 || merchant == address(0)) {
            p.ok = !s.frozen && !_expired(s);
            p.reason =
                s.frozen ? RejectReason.Frozen : (_expired(s) ? RejectReason.Expired : RejectReason.None);
            return p;
        }
        p.reason = _checkWith(id, s, merchant, amount, resourceHash, spent);
        p.ok = p.reason == RejectReason.None;
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _validatePolicy(Policy calldata p) private pure {
        if (p.perCallCap == 0 || p.periodBudget == 0) revert InvalidPolicy();
        if (p.perCallCap > p.periodBudget) revert InvalidPolicy();
        if (p.maxCallsPerWindow != 0 && p.rateWindow == 0) revert InvalidPolicy();
        if (p.maxSameResource != 0 && p.duplicateWindow == 0) revert InvalidPolicy();
    }

    function _expired(Stipend storage s) private view returns (bool) {
        return s.policy.expiresAt != 0 && block.timestamp >= s.policy.expiresAt;
    }

    function _rollPeriod(uint256 id, Stipend storage s) private {
        uint32 len = s.policy.periodLength;
        if (len == 0) return;
        if (block.timestamp < s.periodStart + len) return;
        uint256 elapsed = (block.timestamp - s.periodStart) / len;
        s.periodStart = uint40(s.periodStart + elapsed * len);
        s.spentThisPeriod = 0;
        emit PeriodRolled(id, s.periodStart);
    }

    function _check(uint256 id, Stipend storage s, address merchant, uint128 amount, bytes32 resourceHash)
        private
        view
        returns (RejectReason)
    {
        return _checkWith(id, s, merchant, amount, resourceHash, s.spentThisPeriod);
    }

    function _checkWith(
        uint256 id,
        Stipend storage s,
        address merchant,
        uint128 amount,
        bytes32 resourceHash,
        uint128 spent
    ) private view returns (RejectReason) {
        Policy storage p = s.policy;
        if (s.frozen) return RejectReason.Frozen;
        if (_expired(s)) return RejectReason.Expired;
        if (amount > p.perCallCap) return RejectReason.PerCallCap;
        if (spent + amount > p.periodBudget) return RejectReason.PeriodBudget;
        if (amount > s.balance) return RejectReason.InsufficientBalance;
        if (p.maxCallsPerWindow != 0 && _windowCount(_rate[id], p.rateWindow) >= p.maxCallsPerWindow) {
            return RejectReason.RateLimit;
        }
        if (
            p.maxSameResource != 0
                && _windowCount(_dupes[id][resourceHash], p.duplicateWindow) >= p.maxSameResource
        ) {
            return RejectReason.DuplicateResource;
        }
        return _checkMerchant(id, p, merchant);
    }

    function _checkMerchant(uint256 id, Policy storage p, address merchant)
        private
        view
        returns (RejectReason)
    {
        MerchantMode mode = p.merchantMode;
        if (mode == MerchantMode.Any) return RejectReason.None;

        bool allowed = _allowlist[id][merchant];
        if (mode == MerchantMode.Allowlist) {
            return allowed ? RejectReason.None : RejectReason.MerchantNotAllowed;
        }
        if (mode == MerchantMode.VerifiedOrAllowlist && allowed) return RejectReason.None;

        // Verified / VerifiedOrAllowlist
        if (address(registry) == address(0) || !registry.isVerified(merchant)) {
            return RejectReason.MerchantNotVerified;
        }
        if (p.minMerchantSettlements != 0 && registry.settlementsOf(merchant) < p.minMerchantSettlements) {
            return RejectReason.MerchantTooNew;
        }
        return RejectReason.None;
    }

    function _windowCount(Window storage w, uint32 len) private view returns (uint32) {
        if (block.timestamp >= uint256(w.start) + len) return 0;
        return w.count;
    }

    function _bump(Window storage w, uint32 len) private {
        if (block.timestamp >= uint256(w.start) + len) {
            w.start = uint40(block.timestamp);
            w.count = 1;
        } else {
            w.count += 1;
        }
    }
}
