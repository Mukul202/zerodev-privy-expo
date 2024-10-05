import '../polyfills';

// Permissionless
import { ENTRYPOINT_ADDRESS_V06, providerToSmartAccountSigner } from "permissionless";

// Viem
import { EIP1193Provider, PublicClient, http } from "viem";
import { base } from "viem/chains";

// ZeroDev
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  SponsorUserOperationParameters,
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";

// react
import { useEffect, useState } from "react";
import { ENTRYPOINT_ADDRESS_V06_TYPE } from 'permissionless/_types/types';


const useCreateKernel = (provider: EIP1193Provider, publicClient: PublicClient) => {

  // set the kernel data state 
  const [kernelData, setKernelData] = useState<any>({ kernelAccount: null, kernelClient: null });

  const BUNDLER_RPC = `https://rpc.zerodev.app/api/v2/bundler/${process.env.EXPO_PUBLIC_ZERODEV_ID}`;
  const PAYMASTER_RPC = `https://rpc.zerodev.app/api/v2/paymaster/${process.env.EXPO_PUBLIC_ZERODEV_ID}`;

  const chain = base;
  const entryPoint = ENTRYPOINT_ADDRESS_V06;

  useEffect(() => {
    if (!provider || !publicClient) return;

    const getData = async () => {
      try {
        // Create a signer from Privy provider
        const signer = await providerToSmartAccountSigner(provider);
        console.log("Created Signer:", signer);

        // Create a validator
        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
          signer,
          entryPoint,
          kernelVersion: '0.2.4',
        });
        console.log("Created Ecdsa Validator:", ecdsaValidator);

        // Create a Kernel account
        const kernelAccount = await createKernelAccount(publicClient, {
          plugins: {
            sudo: ecdsaValidator,
          },
          entryPoint,
          kernelVersion: '0.2.4',
        });
        console.log("Created Kernel Account:", kernelAccount);

        // Create a Kernel account client
        const kernelClient = createKernelAccountClient({
          account: kernelAccount,
          chain,
          entryPoint,
          bundlerTransport: http(BUNDLER_RPC),
          middleware: {
            sponsorUserOperation: async ({ userOperation }) => {
              const paymasterClient = createZeroDevPaymasterClient({
                chain:base,
                transport: http(PAYMASTER_RPC),
                entryPoint: ENTRYPOINT_ADDRESS_V06,
              });
              const _userOperation =
                userOperation as SponsorUserOperationParameters<ENTRYPOINT_ADDRESS_V06_TYPE>["userOperation"];
              return paymasterClient.sponsorUserOperation({
                userOperation: _userOperation,
                entryPoint: ENTRYPOINT_ADDRESS_V06,
              });
            },
          },
        });

        console.log("Created Kernel Account Client:", kernelClient);

        setKernelData({ kernelAccount, kernelClient });
      } catch (error) {
        console.log("Error:", error);
      }
    };

    getData();
  }, [provider, publicClient]);

  return kernelData;
};

export default useCreateKernel;
