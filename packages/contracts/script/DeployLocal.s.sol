// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {StipendHub} from "../src/StipendHub.sol";
import {MerchantRegistry} from "../src/MerchantRegistry.sol";
import {MockUSD} from "../src/test/MockUSD.sol";
import {MockIdentityRegistry} from "../src/test/MockIdentityRegistry.sol";

/// @notice Local Anvil deployment with a mintable test dollar and a mock ERC-8004 registry.
/// Uses Anvil's default first account unless DEPLOYER_PRIVATE_KEY is set.
contract DeployLocal is Script {
    uint256 constant ANVIL_KEY_0 = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external {
        uint256 pk = vm.envOr("DEPLOYER_PRIVATE_KEY", ANVIL_KEY_0);
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        MockUSD usd = new MockUSD();
        MockIdentityRegistry identity = new MockIdentityRegistry();
        MerchantRegistry registry = new MerchantRegistry(deployer, address(identity));
        StipendHub hub = new StipendHub(registry);
        registry.setHub(address(hub));
        usd.mint(deployer, 1_000_000e6);
        vm.stopBroadcast();

        console2.log("MockUSD            ", address(usd));
        console2.log("MockIdentity       ", address(identity));
        console2.log("MerchantRegistry   ", address(registry));
        console2.log("StipendHub         ", address(hub));

        string memory json = "deployment";
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeAddress(json, "token", address(usd));
        vm.serializeAddress(json, "identityRegistry", address(identity));
        vm.serializeAddress(json, "merchantRegistry", address(registry));
        string memory out = vm.serializeAddress(json, "stipendHub", address(hub));
        vm.writeJson(out, string.concat("./deployments/", vm.toString(block.chainid), ".json"));
    }
}
