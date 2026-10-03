import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";

/** Kernel + EntryPoint versions used for every Stipnd smart account. Changing these breaks credentials. */
export const KERNEL_VERSION = KERNEL_V3_1;
export const ENTRY_POINT = getEntryPoint("0.7");
