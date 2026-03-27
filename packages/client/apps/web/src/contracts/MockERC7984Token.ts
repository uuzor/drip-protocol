export const MOCK_ERC7984_TOKEN = {
  address: "0x442fa2307fE44B3F6C143B28321d40a95206E82f" as const,
  abi: [
    {
      inputs: [
        { name: "account", type: "address" },
      ],
      name: "confidentialBalanceOf",
      outputs: [{ name: "", type: "bytes32" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { name: "to", type: "address" },
        {
          components: [
            { name: "ctHash", type: "uint256" },
            { name: "securityZone", type: "uint8" },
            { name: "utype", type: "uint8" },
            { name: "signature", type: "bytes" },
          ],
          name: "amount",
          type: "tuple",
        },
      ],
      name: "confidentialMint",
      outputs: [{ name: "", type: "bytes32" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [{ name: "", type: "uint8" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "name",
      outputs: [{ name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [{ name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [{ name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const,
};
