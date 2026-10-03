// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MerchantRegistry} from "../src/MerchantRegistry.sol";
import {IMerchantRegistry} from "../src/interfaces/IMerchantRegistry.sol";
import {MockIdentityRegistry} from "../src/test/MockIdentityRegistry.sol";

contract MerchantRegistryTest is Test {
    MerchantRegistry registry;
    MockIdentityRegistry identity;
    address hub = makeAddr("hub");
    address m1 = makeAddr("m1");
    address m2 = makeAddr("m2");

    function setUp() public {
        identity = new MockIdentityRegistry();
        registry = new MerchantRegistry(address(this), address(identity));
        registry.setHub(hub);
    }

    function test_register_and_list() public {
        vm.prank(m1);
        registry.register("One", "https://one.example", "data");
        vm.prank(m2);
        registry.register("Two", "", "inference,search");

        assertEq(registry.count(), 2);
        address[] memory page = registry.list(0, 10);
        assertEq(page.length, 2);
        assertEq(page[0], m1);
        assertEq(registry.list(5, 10).length, 0);
        assertEq(registry.get(m2).tags, "inference,search");
    }

    function test_register_twiceReverts() public {
        vm.startPrank(m1);
        registry.register("One", "", "");
        vm.expectRevert(IMerchantRegistry.AlreadyRegistered.selector);
        registry.register("One", "", "");
        vm.stopPrank();
    }

    function test_update_requiresRegistration() public {
        vm.prank(m1);
        vm.expectRevert(IMerchantRegistry.NotRegistered.selector);
        registry.update("x", "", "");
    }

    function test_recordSettlement_onlyHub() public {
        vm.expectRevert(IMerchantRegistry.NotHub.selector);
        registry.recordSettlement(m1, address(1), 1);

        vm.prank(hub);
        registry.recordSettlement(m1, address(1), 5);
        assertEq(registry.settlementsOf(m1), 1);
        assertEq(registry.get(m1).volume, 5);
    }

    function test_isVerified_identityRules() public {
        vm.prank(m1);
        registry.register("One", "", "");
        assertFalse(registry.isVerified(m1));
        identity.register(m1);
        assertTrue(registry.isVerified(m1));

        // without an identity registry, registration alone is enough
        registry.setIdentityRegistry(address(0));
        vm.prank(m2);
        registry.register("Two", "", "");
        assertTrue(registry.isVerified(m2));
    }

    function test_linkIdentity_mustOwn() public {
        vm.prank(m1);
        registry.register("One", "", "");
        uint256 id = identity.register(m2);
        vm.prank(m1);
        vm.expectRevert(IMerchantRegistry.NotIdentityOwner.selector);
        registry.linkIdentity(id);

        uint256 mine = identity.register(m1);
        vm.prank(m1);
        registry.linkIdentity(mine);
        assertEq(registry.get(m1).erc8004AgentId, mine);
    }
}
