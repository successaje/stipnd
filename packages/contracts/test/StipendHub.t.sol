// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {StipendHub} from "../src/StipendHub.sol";
import {MerchantRegistry} from "../src/MerchantRegistry.sol";
import {IStipendHub} from "../src/interfaces/IStipendHub.sol";
import {IMerchantRegistry} from "../src/interfaces/IMerchantRegistry.sol";
import {MockUSD} from "../src/test/MockUSD.sol";
import {MockIdentityRegistry} from "../src/test/MockIdentityRegistry.sol";

contract StipendHubTest is Test {
    StipendHub hub;
    MerchantRegistry registry;
    MockUSD usd;
    MockIdentityRegistry identity;

    address owner = makeAddr("owner");
    address stranger = makeAddr("stranger");
    address merchant = makeAddr("merchant");
    address merchant2 = makeAddr("merchant2");

    uint128 constant USD = 1e6;

    function setUp() public {
        usd = new MockUSD();
        identity = new MockIdentityRegistry();
        registry = new MerchantRegistry(address(this), address(identity));
        hub = new StipendHub(registry);
        registry.setHub(address(hub));

        usd.mint(owner, 10_000 * USD);
        vm.prank(owner);
        usd.approve(address(hub), type(uint256).max);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    function _policy() internal pure returns (IStipendHub.Policy memory p) {
        p.periodBudget = 60 * USD;
        p.periodLength = 30 days;
        p.perCallCap = 1 * USD;
        p.maxCallsPerWindow = 5;
        p.rateWindow = 1 hours;
        p.maxSameResource = 3;
        p.duplicateWindow = 1 hours;
        p.merchantMode = IStipendHub.MerchantMode.Any;
    }

    function _create(IStipendHub.Policy memory p, uint128 funding) internal returns (uint256 id) {
        address[] memory none;
        vm.prank(owner);
        id = hub.create(address(usd), "Research bot", "Buys filings and news", p, none, funding);
    }

    function _pay(uint256 id, address to, uint128 amount, bytes32 res) internal returns (bool ok) {
        vm.prank(owner);
        ok = hub.pay(id, to, amount, res, "");
    }

    // ------------------------------------------------------------------
    // create / fund / withdraw
    // ------------------------------------------------------------------

    function test_create_storesStipendAndFunds() public {
        uint256 id = _create(_policy(), 60 * USD);
        IStipendHub.Stipend memory s = hub.getStipend(id);
        assertEq(s.owner, owner);
        assertEq(s.token, address(usd));
        assertEq(s.balance, 60 * USD);
        assertEq(s.name, "Research bot");
        assertEq(usd.balanceOf(address(hub)), 60 * USD);
        uint256[] memory owned = hub.stipendsOf(owner);
        assertEq(owned.length, 1);
        assertEq(owned[0], id);
    }

    function test_create_rejectsInvalidPolicy() public {
        IStipendHub.Policy memory p = _policy();
        p.perCallCap = p.periodBudget + 1;
        address[] memory none;
        vm.prank(owner);
        vm.expectRevert(IStipendHub.InvalidPolicy.selector);
        hub.create(address(usd), "x", "", p, none, 0);

        p = _policy();
        p.maxCallsPerWindow = 3;
        p.rateWindow = 0;
        vm.prank(owner);
        vm.expectRevert(IStipendHub.InvalidPolicy.selector);
        hub.create(address(usd), "x", "", p, none, 0);
    }

    function test_fund_anyoneCanTopUp() public {
        uint256 id = _create(_policy(), 0);
        usd.mint(stranger, 5 * USD);
        vm.startPrank(stranger);
        usd.approve(address(hub), 5 * USD);
        hub.fund(id, 5 * USD);
        vm.stopPrank();
        assertEq(hub.getStipend(id).balance, 5 * USD);
    }

    function test_withdraw_onlyOwner() public {
        uint256 id = _create(_policy(), 10 * USD);
        vm.prank(stranger);
        vm.expectRevert(IStipendHub.NotOwner.selector);
        hub.withdraw(id, 1 * USD, stranger);

        vm.prank(owner);
        hub.withdraw(id, 4 * USD, owner);
        assertEq(hub.getStipend(id).balance, 6 * USD);
        assertEq(usd.balanceOf(owner), 10_000 * USD - 6 * USD);
    }

    // ------------------------------------------------------------------
    // pay: happy path and receipts
    // ------------------------------------------------------------------

    function test_pay_transfersAndEmits() public {
        uint256 id = _create(_policy(), 60 * USD);
        bytes32 res = keccak256("GET /reports/1");

        vm.expectEmit(true, true, true, true);
        emit IStipendHub.Paid(id, merchant, 0.4e6, res, "report 1", 60 * USD - 0.4e6, 60 * USD - 0.4e6);
        vm.prank(owner);
        bool ok = hub.pay(id, merchant, 0.4e6, res, "report 1");

        assertTrue(ok);
        assertEq(usd.balanceOf(merchant), 0.4e6);
        assertEq(registry.settlementsOf(merchant), 1);
    }

    function test_pay_nonOwnerReverts() public {
        uint256 id = _create(_policy(), 60 * USD);
        vm.prank(stranger);
        vm.expectRevert(IStipendHub.NotOwner.selector);
        hub.pay(id, merchant, 1, bytes32(0), "");
    }

    function test_pay_unknownStipendReverts() public {
        vm.prank(owner);
        vm.expectRevert(IStipendHub.UnknownStipend.selector);
        hub.pay(99, merchant, 1, bytes32(0), "");
    }

    // ------------------------------------------------------------------
    // pay: every rejection reason is a receipt, not a revert
    // ------------------------------------------------------------------

    function _expectRejected(uint256 id, uint128 amount, bytes32 res, IStipendHub.RejectReason reason)
        internal
    {
        vm.expectEmit(true, true, true, true);
        emit IStipendHub.PaymentRejected(id, merchant, amount, res, reason);
    }

    function test_reject_perCallCap() public {
        uint256 id = _create(_policy(), 60 * USD);
        _expectRejected(id, 5 * USD, bytes32("a"), IStipendHub.RejectReason.PerCallCap);
        assertFalse(_pay(id, merchant, 5 * USD, bytes32("a")));
        assertEq(usd.balanceOf(merchant), 0);
    }

    function test_reject_periodBudget_thenRefillsNextPeriod() public {
        IStipendHub.Policy memory p = _policy();
        p.periodBudget = 2 * USD;
        p.maxCallsPerWindow = 0;
        p.maxSameResource = 0;
        uint256 id = _create(p, 100 * USD);

        assertTrue(_pay(id, merchant, 1 * USD, bytes32("1")));
        assertTrue(_pay(id, merchant, 1 * USD, bytes32("2")));
        _expectRejected(id, 1 * USD, bytes32("3"), IStipendHub.RejectReason.PeriodBudget);
        assertFalse(_pay(id, merchant, 1 * USD, bytes32("3")));

        vm.warp(block.timestamp + 30 days);
        assertTrue(_pay(id, merchant, 1 * USD, bytes32("4")));
        assertEq(hub.getStipend(id).spentThisPeriod, 1 * USD);
    }

    function test_reject_insufficientBalance() public {
        IStipendHub.Policy memory p = _policy();
        uint256 id = _create(p, 0.5e6);
        _expectRejected(id, 1 * USD, bytes32("a"), IStipendHub.RejectReason.InsufficientBalance);
        assertFalse(_pay(id, merchant, 1 * USD, bytes32("a")));
    }

    function test_reject_rateLimit_resetsAfterWindow() public {
        IStipendHub.Policy memory p = _policy();
        p.maxSameResource = 0;
        uint256 id = _create(p, 60 * USD);
        for (uint256 i = 0; i < 5; ++i) {
            assertTrue(_pay(id, merchant, 0.1e6, bytes32(i)));
        }
        _expectRejected(id, 0.1e6, bytes32("over"), IStipendHub.RejectReason.RateLimit);
        assertFalse(_pay(id, merchant, 0.1e6, bytes32("over")));

        vm.warp(block.timestamp + 1 hours);
        assertTrue(_pay(id, merchant, 0.1e6, bytes32("later")));
    }

    function test_reject_duplicateResource_stopsALoop() public {
        IStipendHub.Policy memory p = _policy();
        p.maxCallsPerWindow = 0; // isolate the duplicate guard
        uint256 id = _create(p, 60 * USD);
        bytes32 same = keccak256("GET /reports/42");

        assertTrue(_pay(id, merchant, 0.1e6, same));
        assertTrue(_pay(id, merchant, 0.1e6, same));
        assertTrue(_pay(id, merchant, 0.1e6, same));
        _expectRejected(id, 0.1e6, same, IStipendHub.RejectReason.DuplicateResource);
        assertFalse(_pay(id, merchant, 0.1e6, same));

        // a different resource is still fine
        assertTrue(_pay(id, merchant, 0.1e6, keccak256("GET /reports/43")));
    }

    function test_reject_frozen_andUnfreeze() public {
        uint256 id = _create(_policy(), 60 * USD);
        vm.prank(owner);
        hub.setFrozen(id, true);
        _expectRejected(id, 0.1e6, bytes32("a"), IStipendHub.RejectReason.Frozen);
        assertFalse(_pay(id, merchant, 0.1e6, bytes32("a")));

        vm.prank(owner);
        hub.setFrozen(id, false);
        assertTrue(_pay(id, merchant, 0.1e6, bytes32("a")));
    }

    function test_reject_expired() public {
        IStipendHub.Policy memory p = _policy();
        p.expiresAt = uint40(block.timestamp + 1 days);
        uint256 id = _create(p, 60 * USD);
        assertTrue(_pay(id, merchant, 0.1e6, bytes32("a")));
        vm.warp(block.timestamp + 1 days);
        _expectRejected(id, 0.1e6, bytes32("b"), IStipendHub.RejectReason.Expired);
        assertFalse(_pay(id, merchant, 0.1e6, bytes32("b")));
    }

    function test_reject_allowlistMode() public {
        IStipendHub.Policy memory p = _policy();
        p.merchantMode = IStipendHub.MerchantMode.Allowlist;
        address[] memory allow = new address[](1);
        allow[0] = merchant2;
        vm.prank(owner);
        uint256 id = hub.create(address(usd), "Allowlisted", "", p, allow, 60 * USD);

        _expectRejected(id, 0.1e6, bytes32("a"), IStipendHub.RejectReason.MerchantNotAllowed);
        assertFalse(_pay(id, merchant, 0.1e6, bytes32("a")));
        assertTrue(_pay(id, merchant2, 0.1e6, bytes32("a")));

        vm.prank(owner);
        hub.setAllowlist(id, allow, false);
        assertFalse(_pay(id, merchant2, 0.1e6, bytes32("b")));
    }

    function test_reject_verifiedMode_requiresRegistryAndIdentity() public {
        IStipendHub.Policy memory p = _policy();
        p.merchantMode = IStipendHub.MerchantMode.Verified;
        uint256 id = _create(p, 60 * USD);

        // unregistered
        _expectRejected(id, 0.1e6, bytes32("a"), IStipendHub.RejectReason.MerchantNotVerified);
        assertFalse(_pay(id, merchant, 0.1e6, bytes32("a")));

        // registered but no ERC-8004 identity
        vm.prank(merchant);
        registry.register("Filings API", "https://filings.example", "data");
        assertFalse(_pay(id, merchant, 0.1e6, bytes32("b")));

        // identity minted -> verified
        identity.register(merchant);
        assertTrue(registry.isVerified(merchant));
        assertTrue(_pay(id, merchant, 0.1e6, bytes32("c")));
    }

    function test_reject_merchantTooNew_thenMaturesWithSettlements() public {
        IStipendHub.Policy memory p = _policy();
        p.merchantMode = IStipendHub.MerchantMode.Verified;
        p.minMerchantSettlements = 2;
        p.maxSameResource = 0;
        uint256 strict = _create(p, 60 * USD);

        // merchant becomes verified
        vm.prank(merchant);
        registry.register("Filings API", "https://filings.example", "data");
        identity.register(merchant);

        _expectRejected(strict, 0.1e6, bytes32("a"), IStipendHub.RejectReason.MerchantTooNew);
        assertFalse(_pay(strict, merchant, 0.1e6, bytes32("a")));

        // a looser stipend builds the merchant's record
        uint256 loose = _create(_policy(), 10 * USD);
        assertTrue(_pay(loose, merchant, 0.1e6, bytes32("x")));
        assertTrue(_pay(loose, merchant, 0.1e6, bytes32("y")));
        assertEq(registry.settlementsOf(merchant), 2);

        // now the strict stipend accepts it: reputation changed what money can do
        assertTrue(_pay(strict, merchant, 0.1e6, bytes32("b")));
    }

    function test_verifiedOrAllowlist_acceptsEither() public {
        IStipendHub.Policy memory p = _policy();
        p.merchantMode = IStipendHub.MerchantMode.VerifiedOrAllowlist;
        address[] memory allow = new address[](1);
        allow[0] = merchant2;
        vm.prank(owner);
        uint256 id = hub.create(address(usd), "Either", "", p, allow, 60 * USD);

        assertTrue(_pay(id, merchant2, 0.1e6, bytes32("a"))); // allowlisted
        assertFalse(_pay(id, merchant, 0.1e6, bytes32("a"))); // neither
        vm.prank(merchant);
        registry.register("M", "", "");
        identity.register(merchant);
        assertTrue(_pay(id, merchant, 0.1e6, bytes32("b"))); // verified
    }

    // ------------------------------------------------------------------
    // policy updates and preview
    // ------------------------------------------------------------------

    function test_updatePolicy_resetsPeriod() public {
        uint256 id = _create(_policy(), 60 * USD);
        assertTrue(_pay(id, merchant, 1 * USD, bytes32("a")));
        IStipendHub.Policy memory p = _policy();
        p.perCallCap = 2 * USD;
        vm.prank(owner);
        hub.updatePolicy(id, p);
        IStipendHub.Stipend memory s = hub.getStipend(id);
        assertEq(s.spentThisPeriod, 0);
        assertEq(s.policy.perCallCap, 2 * USD);
    }

    function test_preview_matchesPay() public {
        IStipendHub.Policy memory p = _policy();
        p.periodBudget = 1 * USD;
        p.periodLength = 1 days;
        uint256 id = _create(p, 10 * USD);
        assertTrue(_pay(id, merchant, 1 * USD, bytes32("a")));

        IStipendHub.Preview memory v = hub.preview(id, merchant, 0.5e6, bytes32("b"));
        assertFalse(v.ok);
        assertEq(uint8(v.reason), uint8(IStipendHub.RejectReason.PeriodBudget));
        assertEq(v.remainingThisPeriod, 0);

        vm.warp(block.timestamp + 1 days);
        v = hub.preview(id, merchant, 0.5e6, bytes32("b"));
        assertTrue(v.ok);
        assertEq(v.remainingThisPeriod, 1 * USD);
        assertEq(v.periodEndsAt, block.timestamp + 1 days);
    }

    function test_preview_zeroAmountReportsStatusOnly() public {
        uint256 id = _create(_policy(), 10 * USD);
        IStipendHub.Preview memory v = hub.preview(id, address(0), 0, bytes32(0));
        assertTrue(v.ok);
        vm.prank(owner);
        hub.setFrozen(id, true);
        v = hub.preview(id, address(0), 0, bytes32(0));
        assertFalse(v.ok);
        assertEq(uint8(v.reason), uint8(IStipendHub.RejectReason.Frozen));
    }

    // ------------------------------------------------------------------
    // fuzz: balance accounting never drifts
    // ------------------------------------------------------------------

    function testFuzz_balanceConservation(uint128 funding, uint8 n, uint128 amountSeed) public {
        funding = uint128(bound(funding, 1 * USD, 1_000 * USD));
        n = uint8(bound(n, 1, 40));
        IStipendHub.Policy memory p = _policy();
        p.periodBudget = type(uint128).max / 2;
        p.perCallCap = 10 * USD;
        p.maxCallsPerWindow = 0;
        p.maxSameResource = 0;
        uint256 id = _create(p, funding);

        uint256 paid;
        for (uint256 i = 0; i < n; ++i) {
            uint128 amt = uint128(bound(uint256(keccak256(abi.encode(amountSeed, i))), 1, 10 * USD));
            bool ok = _pay(id, merchant, amt, bytes32(i));
            if (ok) paid += amt;
        }
        assertEq(hub.getStipend(id).balance, funding - paid);
        assertEq(usd.balanceOf(merchant), paid);
        assertEq(usd.balanceOf(address(hub)), funding - paid);
    }
}
