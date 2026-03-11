import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

interface LotteryDraw {
  game: string;
  drawDate: string; // YYYY-MM-DD
  numbers: number[];
  bonusNumber?: number;
  guaranteedNumber?: string; // For Lotto 6/49 guaranteed prize draw
  jackpot?: string; // Jackpot amount
  jackpotWon: boolean;
  winnersCount?: number; // Number of jackpot winners
  nextDrawDate?: string;
  nextJackpot?: string;
}

interface LotteryData {
  draws: LotteryDraw[];
  collectedAt: string;
}

// Fetch from LotteryCanada.com - reliable source for Canadian lottery results
async function fetchLotteryCanada(
  ctx: CollectorContext,
  game: string,
  url: string,
  numCount: number
): Promise<LotteryDraw | null> {
  try {
    const response = await ctx.fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract draw date from title or h1
    const dateMatch = html.match(/(\w+\s+\d+,?\s+\d{4})\s*[-–]\s*(?:<[^>]+>)?(?:\s*<[^>]+>)*\s*(?:Lotto|BC|Daily)/i)
      || html.match(/"datePublished":"(\d{4}-\d{2}-\d{2})"/);

    // Extract winning numbers from lotcan-number class
    const numbersMatch = html.match(/lotcan-number[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/gi);

    if (!numbersMatch || numbersMatch.length < numCount) return null;

    const numbers: number[] = [];
    for (let i = 0; i < numCount; i++) {
      const numMatch = numbersMatch[i].match(/<strong>(\d+)<\/strong>/);
      if (numMatch) {
        numbers.push(parseInt(numMatch[1], 10));
      }
    }

    if (numbers.length !== numCount) return null;

    // Extract bonus number (usually after main numbers)
    let bonusNumber: number | undefined;
    if (numbersMatch.length > numCount) {
      const bonusMatch = numbersMatch[numCount].match(/<strong>(\d+)<\/strong>/);
      if (bonusMatch) {
        bonusNumber = parseInt(bonusMatch[1], 10);
      }
    }

    // Extract guaranteed winner number (for Lotto 6/49)
    const guaranteedMatch = html.match(/Guaranteed\s*Winner\s*Number[^>]*>[\s\S]*?<span[^>]*>(\d+)<\/span>/i);
    const guaranteedNumber = guaranteedMatch ? guaranteedMatch[1] : undefined;

    // Extract jackpot info
    const jackpotMatch = html.match(/Estimated\s*Jackpot[^$]*\$([\d,]+(?:\.\d+)?(?:\s*million)?)/i);
    const nextJackpot = jackpotMatch ? `$${jackpotMatch[1]}` : undefined;

    // Extract next draw date
    const nextDateMatch = html.match(/Estimated\s*Jackpot\s*for\s*(\w+\s+\d+,?\s+\d{4})/i);
    const nextDrawDate = nextDateMatch ? parseDate(nextDateMatch[1]) : undefined;

    // Check if jackpot was won - look for winner info
    const jackpotWonMatch = html.match(/jackpot\s*(?:was\s*)?won|(\d+)\s*winner|winning\s*ticket\s*sold/i);
    const winnersMatch = html.match(/<td[^>]*>[\s]*(\d+)[\s]*<\/td>[\s\S]*?Jackpot/i);
    const winnersCount = winnersMatch ? parseInt(winnersMatch[1], 10) : undefined;
    const jackpotWon = (winnersCount !== undefined && winnersCount > 0) || !!jackpotWonMatch;

    // Parse the draw date
    let drawDate: string;
    if (dateMatch) {
      drawDate = dateMatch[1].includes('-') ? dateMatch[1] : parseDate(dateMatch[1]);
    } else {
      drawDate = ctx.now.toISOString().split('T')[0];
    }

    return {
      game,
      drawDate,
      numbers,
      bonusNumber,
      guaranteedNumber,
      jackpotWon,
      winnersCount,
      nextDrawDate,
      nextJackpot,
    };
  } catch {
    return null;
  }
}

// Parse date string like "January 25, 2026" to YYYY-MM-DD
function parseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Parse failed
  }
  return new Date().toISOString().split('T')[0];
}

const lotteryCollector: CollectorDefinition<LotteryData> = {
  id: 'lottery',
  schedule: {
    type: 'cron',
    expression: '0 22 * * 1,3,5,6', // Mon, Wed, Fri, Sat at 10 PM (after draws)
  },
  mode: 'both',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 3,
    timeoutMs: 30000,
  },

  async collect(ctx) {
    // Fetch from LotteryCanada for each game
    const [lotto649, lottoMax, dailyGrand, bc49] = await Promise.allSettled([
      fetchLotteryCanada(ctx, 'Lotto 6/49', 'https://www.lotterycanada.com/lotto-649', 6),
      fetchLotteryCanada(ctx, 'Lotto Max', 'https://www.lotterycanada.com/lotto-max', 7),
      fetchLotteryCanada(ctx, 'Daily Grand', 'https://www.lotterycanada.com/daily-grand', 5),
      fetchLotteryCanada(ctx, 'BC/49', 'https://www.lotterycanada.com/bc-49', 6),
    ]);

    const draws: LotteryDraw[] = [];

    if (lotto649.status === 'fulfilled' && lotto649.value) {
      draws.push(lotto649.value);
    }
    if (lottoMax.status === 'fulfilled' && lottoMax.value) {
      draws.push(lottoMax.value);
    }
    if (dailyGrand.status === 'fulfilled' && dailyGrand.value) {
      draws.push(dailyGrand.value);
    }
    if (bc49.status === 'fulfilled' && bc49.value) {
      draws.push(bc49.value);
    }

    // Sort by date descending, then by game name
    draws.sort((a, b) => {
      const dateCompare = b.drawDate.localeCompare(a.drawDate);
      if (dateCompare !== 0) return dateCompare;
      return a.game.localeCompare(b.game);
    });

    return {
      draws,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(lotteryCollector);
