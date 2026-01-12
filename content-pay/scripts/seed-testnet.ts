
import {
    makeContractCall,
    broadcastTransaction,
    AnchorMode,
    PostConditionMode,
    stringAsciiCV,
    uintCV
} from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk';

const MNEMONIC = "finish typical report rare spread gravity clip struggle fancy artwork witness acid";
const DEPLOYER_ADDRESS = "ST34SWDZ8QJEB124ZBEVN6A69DDVQXNVH66AJKY65";
const CONTRACT_NAME = "content-registry";
const NETWORK = STACKS_TESTNET;

async function seedArticles() {
    console.log("Initializing Wallet...");
    // @ts-ignore
    const wallet = await generateWallet({
        secretKey: MNEMONIC,
        password: 'password'
    });

    const account0 = wallet.accounts[0];
    const privKey = account0.stxPrivateKey;
    // @ts-ignore
    const address = getStxAddress({ account: account0, transactionVersion: NETWORK.version });
    console.log(`Using Address: ${address}`);

    const articles = [
        { title: "The Future of sBTC", url: "ipfs://QmFutureSBTC", price: 50, category: "Crypto" },
        { title: "Understanding Clarity", url: "ipfs://QmClarity101", price: 150, category: "Tech" },
        { title: "Stacks 2026 Roadmap", url: "ipfs://QmStacks2026", price: 200, category: "News" }
    ];

    for (const article of articles) {
        console.log(`Publishing: ${article.title}...`);

        const txOptions: any = {
            contractAddress: DEPLOYER_ADDRESS,
            contractName: CONTRACT_NAME,
            functionName: 'publish-article',
            functionArgs: [
                stringAsciiCV(article.title),
                stringAsciiCV(article.url),
                uintCV(article.price),
                stringAsciiCV(article.category)
            ],
            senderKey: privKey,
            network: NETWORK,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Allow,
        };

        try {
            const transaction = await makeContractCall(txOptions);
            const broadcastResponse = await broadcastTransaction(transaction);

            // @ts-ignore
            if (broadcastResponse.error) {
                // @ts-ignore
                console.error(`Error sending ${article.title}:`, broadcastResponse.reason);
            } else {
                // @ts-ignore
                console.log(`Success! TxId: ${broadcastResponse.txid}`);
            }
        } catch (error) {
            console.error(`Failed to publish ${article.title}:`, error);
        }

        await new Promise(r => setTimeout(r, 2000));
    }
}

seedArticles().catch(console.error);
