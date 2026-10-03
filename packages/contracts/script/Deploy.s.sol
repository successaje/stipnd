// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {StipendHub} from "../src/StipendHub.sol";
import {MerchantRegistry} from "../src/MerchantRegistry.sol";

/// @notice Deploys MerchantRegistry + StipendHub to a public network.
/// Env:
///   DEPLOYER_PRIVATE_KEY   deployer key
///   IDENTITY_REGISTRY      ERC-8004 IdentityRegistry address (optional; zero disables)
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address identity = vm.envOr("IDENTITY_REGISTRY", address(0));
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        MerchantRegistry registry = new MerchantRegistry(deployer, identity);
        StipendHub hub = new StipendHub(registry);
        registry.setHub(address(hub));
        vm.stopBroadcast();

        console2.log("chainId            ", block.chainid);
        console2.log("MerchantRegistry   ", address(registry));
        console2.log("StipendHub         ", address(hub));
        console2.log("IdentityRegistry   ", identity);

        _writeDeployment(address(registry), address(hub), identity);
    }

    function _writeDeployment(address registry, address hub, address identity) internal {
        string memory json = "deployment";
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeAddress(json, "merchantRegistry", registry);
        vm.serializeAddress(json, "identityRegistry", identity);
        string memory out = vm.serializeAddress(json, "stipendHub", hub);
        string memory path = string.concat("./deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(out, path);
        console2.log("wrote", path);
    }
}
