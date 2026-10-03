import { addressToEmptyAccount, createKernelAccount, type KernelValidator } from "@zerodev/sdk";
import { serializePermissionAccount, toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Address, PublicClient } from "viem";
import { encodeCredential, type Credential } from "@stipnd/protocol";
import { ENTRY_POINT, KERNEL_VERSION } from "../constants";
import { buildSessionPolicies, type SessionPolicyParams } from "./policies";

export interface IssueCredentialParams {
  /** Public client for the target chain. */
  client: PublicClient;
  /** The owner's root validator (passkey or ECDSA). Signs the permission enable. */
  sudoValidator: KernelValidator;
  chainId: number;
  bundlerUrl: string;
  rpcUrl?: string;
  token: Address;
  tokenDecimals: number;
  tokenSymbol: string;
  label: string;
  policy: SessionPolicyParams;
}

export interface IssuedCredential {
  /** `stipnd_v1_…` string to hand to the agent. Shown once. */
  credential: string;
  decoded: Credential;
  /** Public address of the session key; needed to revoke later. */
  sessionKeyAddress: Address;
  /** Kernel permission id, for display and revocation bookkeeping. */
  permissionId: `0x${string}`;
}

/**
 * Generates a fresh session key, scopes it with `buildSessionPolicies`, has the owner's
 * sudo validator approve it, and packs everything into a credential string.
 *
 * The private key never leaves this function except inside the credential.
 */
export async function issueCredential(p: IssueCredentialParams): Promise<IssuedCredential> {
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  const sessionSigner = await toECDSASigner({ signer: sessionAccount });

  const permissionPlugin = await toPermissionValidator(p.client, {
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    signer: sessionSigner,
    policies: buildSessionPolicies(p.policy),
  });

  const account = await createKernelAccount(p.client, {
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    plugins: { sudo: p.sudoValidator, regular: permissionPlugin },
  });

  const approval = await serializePermissionAccount(account, sessionPrivateKey);

  const decoded: Credential = {
    v: 1,
    chainId: p.chainId,
    hub: p.policy.hub,
    stipendId: p.policy.stipendId.toString(),
    token: p.token,
    tokenDecimals: p.tokenDecimals,
    tokenSymbol: p.tokenSymbol,
    account: account.address,
    bundlerUrl: p.bundlerUrl,
    rpcUrl: p.rpcUrl,
    approval,
    label: p.label,
    issuedAt: Math.floor(Date.now() / 1000),
  };

  return {
    credential: encodeCredential(decoded),
    decoded,
    sessionKeyAddress: sessionAccount.address,
    permissionId: permissionPlugin.getIdentifier(),
  };
}

/**
 * Rebuilds the permission plugin for a previously issued session key so the owner can
 * uninstall it. Requires the same policy parameters used at issuance.
 */
export async function permissionPluginForRevocation(
  client: PublicClient,
  sessionKeyAddress: Address,
  policy: SessionPolicyParams,
) {
  const emptySigner = await toECDSASigner({ signer: addressToEmptyAccount(sessionKeyAddress) });
  return toPermissionValidator(client, {
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    signer: emptySigner,
    policies: buildSessionPolicies(policy),
  });
}
