/**
 * F3 配将模拟器 — 序列化与分享短链
 *
 * localStorage:保存完整多队伍状态(JSON.stringify)
 * URL ?d=  :base64 编码的压缩版本(用于"分享短链"按钮复制)
 *
 * 压缩策略:
 *   - 用 JSON.stringify 后取 JSON.stringify(lineup)
 *   - URL-safe base64(= → ,  / → _  + 去掉末尾 =)
 *   - 单队伍约 200-400 字节,完全可塞进 URL
 */
import type { SandboxLineup, SandboxLineupSet } from "./types";

/** localStorage key(版本号便于以后 schema 升级时清空旧数据) */
export const STORAGE_KEY = "sandbox:lineups:v1";

/** 序列化整组到 localStorage */
export function saveToStorage(set: SandboxLineupSet): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(set));
  } catch {
    // quota / private mode 静默失败 — MVP 不强求
  }
}

/** 从 localStorage 读取(失败/空/版本不匹配 → 返回 null 让 caller 用默认) */
export function loadFromStorage(): SandboxLineupSet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SandboxLineupSet;
    if (!parsed || !Array.isArray(parsed.lineups) || !parsed.activeId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 清空 localStorage */
export function clearStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// URL 短链编码(只编码单个队伍,不是整个 set)
// ---------------------------------------------------------------------------

/** 把单个 lineup 编码成 URL ?d= 参数(URL-safe base64) */
export function encodeLineupToUrlParam(lineup: SandboxLineup): string {
  const json = JSON.stringify(lineup);
  // btoa 在中文环境需要先 encodeURIComponent + unescape
  const b64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf-8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 从 URL ?d= 参数解码回 lineup(失败 → null) */
export function decodeLineupFromUrlParam(param: string): SandboxLineup | null {
  try {
    // 还原 URL-safe base64
    let b64 = param.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const json =
      typeof atob === "function"
        ? decodeURIComponent(escape(atob(b64)))
        : Buffer.from(b64, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as SandboxLineup;
    // 极简校验 — 至少有 id/name
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.name !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 构造分享 URL(基于当前 window.location.origin + pathname + ?d=) */
export function buildShareUrl(lineup: SandboxLineup): string {
  if (typeof window === "undefined") return "";
  const enc = encodeLineupToUrlParam(lineup);
  const url = new URL(window.location.href);
  // 清理其他 query 参数,只留 d
  url.search = "";
  url.searchParams.set("d", enc);
  return url.toString();
}
