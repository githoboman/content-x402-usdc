
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';

export const NETWORK_TYPE = 'testnet'; // Change to 'mainnet' for production

const TESTNET_CONFIG = {
    deployer: 'ST34SWDZ8QJEB124ZBEVN6A69DDVQXNVH66AJKY65',
    contractName: 'content-registry',
    network: STACKS_TESTNET,
    apiUrl: 'https://api.testnet.hiro.so',
};

const MAINNET_CONFIG = {
    deployer: 'SP1234...', // Update when ready
    contractName: 'content-registry',
    network: STACKS_MAINNET,
    apiUrl: 'https://api.mainnet.hiro.so',
};

export const CONFIG = NETWORK_TYPE === 'testnet' ? TESTNET_CONFIG : MAINNET_CONFIG;

// Mock Contract Names (v1)
export const ORACLE_NAME = 'mock-pyth-oracle-v1';
export const SBTC_NAME = 'mock-sbtc-v1';
export const USDC_NAME = 'mock-usdc-v1';
