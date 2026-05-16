// blockchain.js - Handles Web3 Wallet connections and Polygon interactions

// Polygon Mainnet & Amoy Testnet configs
const NETWORKS = {
  mainnet: {
    chainId: '0x89', // 137
    chainName: 'Polygon Mainnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com/'],
    blockExplorerUrls: ['https://polygonscan.com/']
  },
  amoy: {
    chainId: '0x138a4', // 80002
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://rpc-amoy.polygon.technology/'],
    blockExplorerUrls: ['https://amoy.polygonscan.com/']
  }
};

// Target network (Switch to 'mainnet' for prod)
const TARGET_NETWORK = NETWORKS.amoy;

let provider = null;
let signer = null;
let userAddress = null;

// DOM Elements
const connectBtn = document.getElementById('connect-wallet-btn');
const btnText = document.getElementById('wallet-btn-text');
const balanceDisplay = document.getElementById('wallet-balance');

if (connectBtn) {
  connectBtn.addEventListener('click', async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet to connect.");
      return;
    }

    // Connect Wallet
    await connectWallet();
  });
}

/**
 * Connect to window.ethereum and request accounts
 */
async function connectWallet() {
  try {
    // Disable button while connecting
    connectBtn.disabled = true;
    btnText.textContent = "Connecting...";

    // Use ethers browser provider
    provider = new ethers.BrowserProvider(window.ethereum);

    // Request accounts
    const accounts = await provider.send("eth_requestAccounts", []);
    if (accounts.length > 0) {
      userAddress = accounts[0];

      // Check network
      await checkNetwork();

      // Update UI
      updateWalletUI();

      // Listen for account/network changes
      setupEventListeners();
    }
  } catch (error) {
    console.error("User rejected request or error connecting:", error);
    btnText.textContent = "Connect Wallet";
  } finally {
    connectBtn.disabled = false;
  }
}

/**
 * Ensures user is on the correct Polygon network.
 * Prompts switch, and if missing, adds it to the wallet.
 */
async function checkNetwork() {
  if (!provider) return;
  const network = await provider.getNetwork();

  // Convert chainId from BigInt to hex string for comparison
  const currentChainIdHex = '0x' + network.chainId.toString(16);

  if (currentChainIdHex !== TARGET_NETWORK.chainId) {
    console.log(`Wrong network detected. Expected ${TARGET_NETWORK.chainId}, got ${currentChainIdHex}. Prompting switch...`);
    await switchToPolygon();
  }
}

/**
 * Prompts user to switch to Polygon (or adds it if not present)
 */
async function switchToPolygon() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: TARGET_NETWORK.chainId }]
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [TARGET_NETWORK]
        });
      } catch (addError) {
        console.error("Failed to add Polygon network:", addError);
        alert("Failed to add the Polygon network to your wallet. Please add it manually.");
      }
    } else {
      console.error("Failed to switch network:", switchError);
    }
  }

  // Re-initialize provider after network switch
  provider = new ethers.BrowserProvider(window.ethereum);
}

/**
 * Formats the address for display (e.g., 0x1234...abcd)
 */
function truncateAddress(address) {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Updates UI with connected wallet info
 */
async function updateWalletUI() {
  if (userAddress) {
    btnText.textContent = truncateAddress(userAddress);
    connectBtn.classList.replace('btn-primary', 'bg-theme-panel');
    connectBtn.classList.replace('hover:bg-blue-600', 'hover:bg-theme-panelHover');
    connectBtn.classList.add('border', 'border-theme-border', 'text-theme-textMain');

    // Show mocked $NKXP balance
    balanceDisplay.classList.remove('hidden');

    // In the future, read real token balance using ethers.Contract
    // const contract = new ethers.Contract(TOKEN_ADDRESS, ABI, provider);
    // const balance = await contract.balanceOf(userAddress);
    // balanceDisplay.textContent = `${ethers.formatUnits(balance, 18)} NKXP`;
  }
}

/**
 * Setup listeners for when user switches accounts or networks in MetaMask
 */
function setupEventListeners() {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      // User disconnected
      userAddress = null;
      btnText.textContent = "Connect Wallet";
      balanceDisplay.classList.add('hidden');
      connectBtn.classList.remove('bg-theme-panel', 'hover:bg-theme-panelHover', 'border', 'border-theme-border', 'text-theme-textMain');
      connectBtn.classList.add('btn-primary', 'hover:bg-blue-600');
    } else {
      userAddress = accounts[0];
      updateWalletUI();
    }
  });

  window.ethereum.on('chainChanged', () => {
    // Reload page to avoid stale data per MetaMask recommendations
    window.location.reload();
  });
}

/**
 * Placeholder function for triggering the smart contract mint.
 * To be called when a user levels up or completes a session.
 */
async function claimPostureRewards(amount) {
  if (!userAddress || !provider) {
    console.log("Wallet not connected. Rewards will not be minted.");
    return false;
  }

  try {
    signer = await provider.getSigner();
    console.log(`Initiating on-chain mint for ${amount} $NKXP on Polygon...`);

    // Placeholder for contract interaction
    // const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    // const tx = await contract.mint(userAddress, ethers.parseUnits(amount.toString(), 18));
    // await tx.wait();

    console.log(`Success! Transaction confirmed.`);
    return true;
  } catch (err) {
    console.error("Failed to claim rewards:", err);
    return false;
  }
}

// Export for use in game logic if needed
window.blockchain = {
  connectWallet,
  switchToPolygon,
  claimPostureRewards,
  getUserAddress: () => userAddress
};
