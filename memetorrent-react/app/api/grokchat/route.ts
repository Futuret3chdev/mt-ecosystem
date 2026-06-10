import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ reply: 'Please enter a message.' }, { status: 400 });
    }

    const msg = message.trim();
    const lower = msg.toLowerCase();
    let reply = '';

    // Enhanced Grok-style MT ECO SYSTEM assistant - answers directly on site
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('greet')) {
      reply = "Hello! I'm the MT ECO SYSTEM assistant. Ask me about $MT, the wallet, utilities, bridges, or how to get involved.";
    } else if (lower.includes('help') || lower.includes('support') || lower.includes('how do i') || lower.includes('guide')) {
      reply = "I'm here to help! You can explore the site for LIVE $MT stats, use the BUY $MT NOW panel (self-custodial wallet connect), check the interactive whitepaper at /whitepaper, or run the management flows on the homepage. What specifically do you need?";
    } else if (lower.includes('price') || lower.includes('$mt') || lower.includes('token price') || lower.includes('how much')) {
      reply = "$MT live stats (price, market cap, volume) are shown on the homepage under LIVE $MT. The contract address is ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump. You can buy directly using the BUY $MT NOW button with your own wallet.";
    } else if (lower.includes('wallet') || lower.includes('infinite') || lower.includes('infinite wallet')) {
      reply = "INFINITE WALLET is our fully self-custodial wallet at https://mt.futuret3ch.com.au/. It supports native MT, Solana $MT, minting NFTs, earning/spending Rockets, and all the real management flows. Your keys never leave your device.";
    } else if (lower.includes('bridge') || lower.includes('swap') || lower.includes('cross chain')) {
      reply = "You can bridge Native MT ↔ SPL $MT and perform swaps inside INFINITE WALLET. Real on-chain flows (with demo versions) are available right on the homepage under ONE-PLACE MANAGEMENT FLOWS.";
    } else if (lower.includes('whitepaper') || lower.includes('docs') || lower.includes('paper')) {
      reply = "The official interactive MT ECO SYSTEM Whitepaper (flipbook style) is at /whitepaper. Full PDF available there too: https://memetorrent.futuret3ch.com.au/whitepaper.pdf";
    } else if (lower.includes('develop') || lower.includes('sdk') || lower.includes('api') || lower.includes('build') || lower.includes('developer')) {
      reply = "Developer resources, SDKs, and downloads are coming soon at /developers. We are building self-hosted infrastructure with a focus on transparency. Check the page for updates or ask me more specific questions.";
    } else if (lower.includes('buy') || lower.includes('purchase') || lower.includes('get $mt') || lower.includes('how to buy')) {
      reply = "Use the BUY $MT NOW button in the top navigation bar. Connect your self-custodial wallet (Phantom, Solflare, or Backpack), enter the SOL amount, and sign the on-chain transaction directly. Everything stays in your control. See the Raydium fundamentals for how Solana swaps work: https://docs.raydium.io/solana-fundamentals";
    } else if (lower.includes('futuret3ch') || lower.includes('future t3ch') || lower.includes('the team') || lower.includes('who built') || lower.includes('company') || lower.includes('developed by')) {
      reply = "Futuret3ch is the Australian technology company behind the MT ECO SYSTEM and MemeTorrent. We build self-hosted blockchain infrastructure, the INFINITE WALLET, and real-utility projects with complete transparency. No third parties. More at https://www.futuret3ch.com.au.";
    } else if (lower.includes('about me') || lower.includes('tell me about me') || lower.includes('tell me about mt') || lower.includes('what is mt') || lower.includes('about mt') || lower.includes('ecosystem')) {
      reply = "The MT ECO SYSTEM is a self-built, self-hosted on-chain network powered by the native $MT token. We have the INFINITE WALLET, P2E utilities with Rockets, NFTs, bridges, and real management flows — all without third parties. Own your keys, own your assets. Explore the homepage for LIVE $MT, tokenomics, utilities, and flows.";
    } else if (lower.includes('tokenomics') || lower.includes('supply') || lower.includes('how many')) {
      reply = "Total supply is 1,000,000,000 $MT. Breakdown: 18% Presale, 10% Liquidity, 20% Staking, 45% Mining, 4% Airdrops, 2.5% Development, 0.5% Team. Full details and vesting in the whitepaper at /whitepaper.";
    } else if (lower.includes('utility') || lower.includes('utilities') || lower.includes('what can i do') || lower.includes('use $mt for')) {
      reply = "$MT is the universal key: P2E Mining (earn Rockets), NFT Digital Identity, Physical/Digital Store access, future MT-CHAIN features, Launchpad, Vault rewards, and more. Real utility across the ecosystem. See the full list on the homepage under CORE UTILITIES.";
    } else if (lower.includes('safety') || lower.includes('security') || lower.includes('keys') || lower.includes('seed')) {
      reply = "Safety is core: Client-side key generation, local encryption (AES-GCM + PBKDF2), ed25519 signing on-device, and no seeds ever leave your machine. See the SAFETY section on the homepage for full details.";
    } else if (lower.includes('constellation') || lower.includes('map') || lower.includes('ecosystem map')) {
      reply = "The MT-ECO SYSTEM CONSTELLATION on the homepage is an interactive visual map showing MT Core, INFINITE WALLET, TAP, bridges, and more — all self-built and connected.";
    } else if (lower.includes('tap') || lower.includes('games') || lower.includes('p2e') || lower.includes('rockets')) {
      reply = "TAP is our gaming & utility layer: TAP Shop, Match, Transport, and Studio. Earn Rockets in games like Cosmic Dash and Neon Salvage. Rockets and NFTs live in your INFINITE WALLET. See the TAP section on the homepage.";
    } else if (lower.includes('contact') || lower.includes('reach') || lower.includes('overlords')) {
      reply = "You can reach the Meme Overlords via the emails on this page (Support@MemeTorrent.com or Michael@MemeTorrent.com), the InnoBot chat here, or the social links in the main navbar. We reply fast.";
    } else {
      // Grok-style helpful fallback - actually answers instead of generic team notification
      reply = `Thanks for asking about "${msg}". I'm the MT ECO SYSTEM assistant built to help directly here on the site. 

Key areas I can tell you about:
• $MT token, price, and how to buy on-chain (use the BUY $MT NOW button)
• INFINITE WALLET features and self-custody
• Utilities, Rockets, NFTs, and P2E with TAP
• Bridges, swaps, and the ONE-PLACE MANAGEMENT FLOWS
• The interactive whitepaper at /whitepaper
• Safety, tokenomics, and the self-built constellation

What would you like to know more about?`;
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('grokchat error:', error);
    return NextResponse.json({ 
      reply: "Sorry, something went wrong. Try asking again about $MT, the wallet, utilities, or the whitepaper." 
    }, { status: 500 });
  }
}
