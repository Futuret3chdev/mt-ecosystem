import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = '7899518581:AAGWGghZCOSN_Dyoi-7GDNAJYQBvPvR5ozk';
const TELEGRAM_CHAT_ID = '-1003635190156';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ reply: 'Please enter a message.' }, { status: 400 });
    }

    const msg = message.trim();

    // Forward every message to the Telegram group for human review / help
    const telegramText = `🌐 New message from MT ECO SYSTEM website contact:\n\n"${msg}"\n\nPlease respond to the user (via this group or by DMing them if possible).`;

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: telegramText,
          parse_mode: 'HTML',
        }),
      });
    } catch (tgErr) {
      console.error('Telegram forward failed:', tgErr);
      // Still try to give user a reply even if Telegram fails
    }

    // Simple rule-based AI responder for immediate chat experience
    const lower = msg.toLowerCase();
    let reply = '';

    if (lower.includes('help') || lower.includes('support') || lower.includes('ticket') || lower.includes('contact team')) {
      reply = "I've forwarded your request to the MT team on Telegram (group -1003635190156). They will get back to you as soon as possible. In the meantime, what specifically do you need help with?";
    } else if (lower.includes('price') || lower.includes('$mt') || lower.includes('token')) {
      reply = "$MT live stats (price, market cap, volume) are shown on the homepage under LIVE $MT. The contract is ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump. You can buy directly on this site using the BUY $MT NOW button.";
    } else if (lower.includes('wallet') || lower.includes('infinite')) {
      reply = "INFINITE WALLET is our self-custodial wallet at https://wallet.futuret3ch.com.au/. It supports native MT, Solana $MT, NFTs, Rockets, and all the management flows. Keys never leave your device.";
    } else if (lower.includes('bridge') || lower.includes('swap')) {
      reply = "You can bridge Native MT ↔ SPL $MT and do swaps inside INFINITE WALLET (Jupiter routing). Demo flows are available on the homepage under ONE-PLACE MANAGEMENT FLOWS.";
    } else if (lower.includes('whitepaper') || lower.includes('docs')) {
      reply = "The interactive MT ECO SYSTEM Whitepaper is at /whitepaper. Full PDF: https://memetorrent.futuret3ch.com.au/whitepaper.pdf";
    } else if (lower.includes('develop') || lower.includes('sdk') || lower.includes('api')) {
      reply = "Developer resources, SDKs and downloads are coming soon at /developers. Licenses will be required for core components. Check back or message here for updates.";
    } else if (lower.includes('buy') || lower.includes('purchase')) {
      reply = "Use the BUY $MT NOW button in the top bar. Connect Phantom, Solflare or Backpack (best in-app browser on mobile) and follow the on-page flow. See Raydium fundamentals for best practices: https://docs.raydium.io/solana-fundamentals";
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      reply = "Hello! I'm the MT ECO SYSTEM assistant. Ask me about $MT, the wallet, utilities, bridges, or how to get involved.";
    } else if (lower.includes('futuret3ch') || lower.includes('future t3ch') || lower.includes('the team') || lower.includes('who built') || lower.includes('company behind') || lower.includes('developed by')) {
      reply = "Futuret3ch is the Australian technology company behind the MT ECO SYSTEM and MemeTorrent. We design and build self-hosted blockchain infrastructure, the INFINITE WALLET, bridges, and real-utility projects with full transparency. Learn more at https://www.futuret3ch.com.au. I've also forwarded your question to the team on Telegram.";
    } else {
      reply = `Thanks for your message about "${msg}". I've notified the team via Telegram (they can reply here or in the group). In the meantime, you can explore LIVE $MT stats, the interactive whitepaper at /whitepaper, or the management flows on the homepage. What else would you like to know?`;
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('grokchat error:', error);
    return NextResponse.json({ 
      reply: "Sorry, something went wrong processing your message. The team has still been notified via Telegram." 
    }, { status: 500 });
  }
}
