/**
 * Automatic PO (Proof-of-Origin) token manager for yt-dlp.
 *
 * YouTube requires PO tokens on server/datacenter IPs since late 2024.
 * This module runs the botguard challenge automatically using bgutils-js —
 * no cookies, no manual setup, no browser required.
 *
 * Tokens are refreshed every 4 hours automatically.
 */

import { Innertube } from "youtubei.js";
import { BG } from "bgutils-js";
import * as vm from "node:vm";
import { logger } from "./logger";

const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface TokenCache {
  visitorData: string;
  poToken: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;
let pending: Promise<TokenCache | null> | null = null;

async function generate(): Promise<TokenCache | null> {
  try {
    logger.info("yt-dlp: generating PO token…");

    const yt = await Innertube.create({ retrieve_player: false });
    const visitorData = (yt.session.context.client as any).visitorData as string | undefined;

    if (!visitorData) throw new Error("no visitor_data in Innertube context");

    // bgConfig acts as BOTH the bgutils config AND the VM sandbox (globalObj = itself).
    // The botguard interpreter script writes to bgConfig[globalName] via bare assignment.
    // BotGuardClient then reads bgConfig.globalObj[globalName] = bgConfig[globalName] ✓
    const bgConfig: any = {
      fetch: (url: string, opts?: RequestInit) => fetch(url, opts),
      identifier: visitorData,
      requestKey: REQUEST_KEY,
    };
    // Self-reference: globalObj === bgConfig so reads and writes land on the same object
    bgConfig.globalObj = bgConfig;
    // Browser globals the botguard script may reference
    bgConfig.window     = bgConfig;
    bgConfig.globalThis = bgConfig;
    bgConfig.self       = bgConfig;

    const challenge = await BG.Challenge.create(bgConfig);
    if (!challenge) throw new Error("BG.Challenge.create returned null");

    const interpreterJs =
      (challenge as any).interpreterJavascript
        ?.privateDoNotAccessOrElseSafeScriptWrappedValue as string | undefined;

    if (interpreterJs) {
      // Run the botguard interpreter with bgConfig as the global scope.
      // Bare assignments and 'this.*' writes go directly onto bgConfig.
      new vm.Script(interpreterJs).runInNewContext(bgConfig);
    }

    const result = await BG.PoToken.generate({
      program: (challenge as any).program,
      globalName: (challenge as any).globalName,
      bgConfig,
    });

    const poToken = (result as any)?.poToken ?? result;
    if (!poToken || typeof poToken !== "string") {
      throw new Error(`PoToken.generate returned unexpected value: ${JSON.stringify(result)}`);
    }

    logger.info("yt-dlp: PO token ready");
    return {
      visitorData,
      poToken,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  } catch (err: any) {
    logger.warn(
      { err: err?.message ?? String(err) },
      "yt-dlp: PO token generation failed — continuing without (ios/tv_embedded fallback active)",
    );
    return null;
  }
}

async function getOrRefresh(): Promise<TokenCache | null> {
  if (cache && Date.now() < cache.expiresAt) return cache;

  if (!pending) {
    pending = generate()
      .then((result) => {
        cache = result;
        return result;
      })
      .finally(() => {
        pending = null;
      });
  }

  return pending;
}

/**
 * Returns extra yt-dlp args that embed a fresh PO token.
 * Returns [] if token generation fails so callers degrade gracefully
 * to the ios/android/tv_embedded client fallback chain.
 */
export async function poTokenArgs(): Promise<string[]> {
  const tok = await getOrRefresh();
  if (!tok) return [];
  return [
    "--extractor-args",
    `youtube:visitor_data=${tok.visitorData},po_token=WEB+${tok.poToken}`,
  ];
}

// Warm up immediately so the first user request doesn't wait.
getOrRefresh().catch(() => {});

// Refresh in the background every 3.5 hours so tokens never expire mid-request.
setInterval(
  () => {
    cache = null;
    getOrRefresh().catch(() => {});
  },
  3.5 * 60 * 60 * 1000,
).unref();
