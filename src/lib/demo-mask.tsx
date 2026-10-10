import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Demo mask: swap every brand / product-line name on screen for a playful
// themed name (Cola, Pika or K-pop) so the app can be demoed or recorded
// without showing any brand. It's display-only: the agent and the tools always
// work on the real names, and the masking is applied to what comes back
// (dashboard rows, Ace's briefs and citations, scraped products, social posts,
// research reports, read-aloud text). URLs are never altered.

export type MaskTheme = "off" | "cola" | "pika" | "kpop";

export const MASK_THEMES: { id: MaskTheme; label: string }[] = [
  { id: "off", label: "Real names" },
  { id: "cola", label: "Cola 🥤" },
  { id: "pika", label: "Pika ⚡" },
  { id: "kpop", label: "K-pop 🎤" },
];

type Role =
  | "house"
  | "hero"
  | "heroShort"
  | "stellar"
  | "soleil"
  | "rouge"
  | "kiss"
  | "rival1"
  | "rival2";

interface Theme {
  names: Record<Role, string>;
  zh: Partial<Record<Role, string>>;
  rivals: string[];
  rivalsZh: string[];
}

const THEMES: Record<Exclude<MaskTheme, "off">, Theme> = {
  cola: {
    names: {
      house: "Cola Classic Beauty",
      hero: "Cola Gold",
      heroShort: "C/Gold",
      stellar: "Zero Sugar",
      soleil: "Cherry Cola",
      rouge: "Cola Red",
      kiss: "Fizz Kiss",
      rival1: "Root Beer Lab",
      rival2: "Lemon Spark",
    },
    zh: { house: "可樂美妝", rival1: "沙士實驗室", rival2: "檸檬氣泡" },
    rivals: [
      "Ginger Pop",
      "Orange Fizz",
      "Cream Soda Co.",
      "Grape Soda Studio",
      "Tonic Beauty",
      "Sparkling Lab",
      "Vanilla Float",
      "Cola Lime",
    ],
    rivalsZh: [
      "薑汁汽水",
      "橘子汽水",
      "奶油蘇打",
      "葡萄汽水",
      "通寧美妝",
      "氣泡實驗室",
      "香草漂浮",
      "萊姆可樂",
    ],
  },
  pika: {
    names: {
      house: "Pika Pika Beauty",
      hero: "Thunder Gold",
      heroShort: "T/Gold",
      stellar: "Stardust",
      soleil: "Ember Glow",
      rouge: "Volt Rouge",
      kiss: "Pika Kiss",
      rival1: "Team Rocket Cosmetics",
      rival2: "Eevee Lab",
    },
    zh: { house: "皮卡美妝", rival1: "火箭隊彩妝", rival2: "伊布實驗室" },
    rivals: [
      "Snorlax Studio",
      "Jiggly Beauty",
      "Psyduck Co.",
      "Togepi Glow",
      "Meowth Make-up",
      "Bulba Botanics",
      "Squirtle Splash",
      "Mew Atelier",
    ],
    rivalsZh: [
      "卡比獸工作室",
      "胖丁美妝",
      "可達鴨彩妝",
      "波克比光采",
      "喵喵彩妝",
      "妙蛙植萃",
      "傑尼龜水感",
      "夢幻工坊",
    ],
  },
  kpop: {
    names: {
      house: "Seoul Idol Beauty",
      hero: "Golden Stage",
      heroShort: "G/Stage",
      stellar: "Lightstick",
      soleil: "Sunset Encore",
      rouge: "Comeback Rouge",
      kiss: "Fan Kiss",
      rival1: "Neon Seoul",
      rival2: "Bias Lab",
    },
    zh: { house: "首爾偶像美妝", rival1: "霓虹首爾", rival2: "本命實驗室" },
    rivals: [
      "Encore Cosmetics",
      "Hallyu Glow",
      "Maknae Studio",
      "Debut Beauty",
      "Fandom Lab",
      "Center Stage Co.",
      "Visual Atelier",
      "Trainee Beauty",
    ],
    rivalsZh: [
      "安可彩妝",
      "韓流光采",
      "忙內工作室",
      "出道美妝",
      "粉絲實驗室",
      "C位彩妝",
      "門面工坊",
      "練習生美妝",
    ],
  },
};

// Names of the synthetic demo data (src/data/snapshot.json) and the two rival
// brands used in the demo scans, mapped to roles.
const ROLE_SOURCES: [string, Role, boolean?][] = [
  ["Maison Aurelle", "house"],
  ["Aurum Gold", "hero"],
  ["A/Gold", "heroShort"],
  ["Stellaria", "stellar"],
  ["Soleil", "soleil"],
  ["Rouge A", "rouge"],
  ["Kiss Lab", "kiss"],
  ["M.A.C", "rival1"],
  ["MAC", "rival1", true],
  ["Mac", "rival1", true],
  ["Laura Mercier", "rival2"],
];
const ROLE_SOURCES_ZH: [string, Role][] = [
  ["魅可", "rival1"],
  ["蘿拉蜜思", "rival2"],
];

// Other real make-up brands that show up in live scrapes and social posts.
const OTHER_BRANDS = [
  "Guerlain",
  "Dior",
  "Chanel",
  "Lancôme",
  "Lancome",
  "Estée Lauder",
  "Estee Lauder",
  "Shiseido",
  "NARS",
  "Giorgio Armani",
  "Armani",
  "Bobbi Brown",
  "Clinique",
  "SK-II",
  "YSL",
  "Yves Saint Laurent",
  "WAKEMAKE",
  "MKUP",
  "3CE",
  "CLIO",
  "Laneige",
  "Sulwhasoo",
  "Innisfree",
  "Etude",
  "Maybelline",
  "L'Oréal",
  "L'Oreal",
  "Kanebo",
  "KATE",
  "Fenty Beauty",
  "Charlotte Tilbury",
  "Shu Uemura",
  "Make Up For Ever",
  "Hourglass",
  "Tom Ford",
  "Sisley",
  "Clé de Peau",
  "Cle de Peau",
  "Albion",
  "Givenchy",
  "Hera",
  "Espoir",
  "Jill Stuart",
  "Paul & Joe",
  "Anna Sui",
  "Kiko",
  "Huda Beauty",
  "Benefit",
  "Too Faced",
  "Urban Decay",
  "Rare Beauty",
];
const OTHER_BRANDS_ZH = [
  "嬌蘭",
  "迪奧",
  "香奈兒",
  "蘭蔻",
  "雅詩蘭黛",
  "資生堂",
  "亞曼尼",
  "芭比波朗",
  "倩碧",
  "植村秀",
  "肌膚之鑰",
  "佳麗寶",
  "巴黎萊雅",
  "媚比琳",
  "蘭芝",
  "雪花秀",
  "美咖",
  "紀梵希",
  "聖羅蘭",
  "希思黎",
  "奧爾濱",
];

const URL_SPLIT = /(https?:\/\/[^\s)"'】」]+)/g;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isUpper = (s: string) => s === s.toUpperCase() && s !== s.toLowerCase();

function hashPick(s: string, list: string[]) {
  let h = 0;
  for (const ch of s.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

export interface Masker {
  theme: MaskTheme;
  mask: (text: string) => string;
  /** Mask a bare brand field: known names are themed, unknown brands get a themed rival. */
  maskBrand: (brand: string) => string;
  /** Turn themed names typed by the user back into the real names before asking Ace. */
  unmask: (text: string) => string;
  deepMask: <T>(value: T) => T;
}

export function buildMasker(theme: MaskTheme): Masker {
  if (theme === "off") {
    const id = (s: string) => s;
    return { theme, mask: id, maskBrand: id, unmask: id, deepMask: (v) => v };
  }
  const T = THEMES[theme];
  const table = new Map<string, string>(); // exact-case source → replacement
  const add = (src: string, rep: string, exactCase = false) => {
    if (!table.has(src)) table.set(src, rep);
    if (exactCase) return;
    // "AURUM GOLD" → "COLA GOLD", but a naturally upper-case brand ("NARS") keeps the theme's casing
    const up = src.toUpperCase();
    if (up !== src && !table.has(up)) table.set(up, rep.toUpperCase());
    const lo = src.toLowerCase();
    if (lo !== src && !table.has(lo)) table.set(lo, rep);
  };
  for (const [src, role, exact] of ROLE_SOURCES) add(src, T.names[role], exact);
  for (const [src, role] of ROLE_SOURCES_ZH) table.set(src, T.zh[role] ?? T.names[role]);
  for (const b of OTHER_BRANDS) add(b, hashPick(b, T.rivals));
  for (const b of OTHER_BRANDS_ZH) table.set(b, hashPick(b, T.rivalsZh));

  const keys = [...table.keys()].sort((a, b) => b.length - a.length);
  // Latin names need word boundaries; CJK names don't.
  const pattern = keys
    .map((k) =>
      /^[㐀-鿿]+$/.test(k) ? escapeRe(k) : `(?<![A-Za-z0-9])${escapeRe(k)}(?![A-Za-z0-9])`,
    )
    .join("|");
  const re = new RegExp(pattern, "g");
  const themed = new Set([...table.values()]);

  // Brand names glued into social handles / hashtags (@brandbeauty, #brandcushion)
  const squash = (x: string) =>
    x
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const handleKeys: [string, string][] = [];
  for (const [src, rep] of table) {
    const k = squash(src);
    if (k.length >= 3 && !handleKeys.some(([hk]) => hk === k)) handleKeys.push([k, squash(rep)]);
  }
  handleKeys.sort((a, b) => b[0].length - a[0].length);
  const maskHandle = (prefix: string, inner: string) => {
    const low = inner.toLowerCase();
    const hit = handleKeys.find(([k]) => low.includes(k));
    if (!hit) return prefix + inner;
    const at = low.indexOf(hit[0]);
    return prefix + inner.slice(0, at) + hit[1] + inner.slice(at + hit[0].length);
  };

  const maskPlain = (s: string) =>
    s
      // handles first, so "@nars_taiwan" becomes "@fandomlab_taiwan", not "@Fandom Lab_taiwan"
      .replace(/([@#])([A-Za-z0-9_.]{2,40})/g, (_all, prefix: string, inner: string) =>
        maskHandle(prefix, inner),
      )
      .replace(re, (m) => table.get(m) ?? m)
      // momo-style 【Brand】 prefixes for brands we don't know yet
      .replace(/【([^】]{1,30})】/g, (all, inner: string) =>
        themed.has(inner) || [...themed].some((t) => inner.includes(t))
          ? all
          : `【${hashPick(inner, T.rivals)}】`,
      );

  const mask = (text: string) => {
    if (!text) return text;
    return text
      .split(URL_SPLIT)
      .map((part, i) => (i % 2 === 1 ? part : maskPlain(part)))
      .join("");
  };

  const maskBrand = (brand: string) => {
    if (!brand) return brand;
    const m = mask(brand);
    return m !== brand ? m : hashPick(brand, /[㐀-鿿]/.test(brand) ? T.rivalsZh : T.rivals);
  };

  // reverse map for the main roles (enough for typed questions)
  const reverse = new Map<string, string>();
  for (const [src, role] of ROLE_SOURCES) {
    const rep = T.names[role];
    if (!reverse.has(rep.toLowerCase())) reverse.set(rep.toLowerCase(), src);
  }
  const revRe = new RegExp(
    [...reverse.keys()]
      .sort((a, b) => b.length - a.length)
      .map((k) => `(?<![A-Za-z0-9])${escapeRe(k)}(?![A-Za-z0-9])`)
      .join("|"),
    "gi",
  );
  const unmask = (text: string) =>
    text.replace(revRe, (m) => {
      const src = reverse.get(m.toLowerCase()) ?? m;
      return isUpper(m) ? src.toUpperCase() : src;
    });

  const deepMask = <V,>(value: V): V => {
    if (typeof value === "string") return mask(value) as V;
    if (Array.isArray(value)) return value.map((v) => deepMask(v)) as V;
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepMask(v);
      return out as V;
    }
    return value;
  };

  return { theme, mask, maskBrand, unmask, deepMask };
}

/* ---------- React context ---------- */

const STORAGE_KEY = "ace-demo-mask";
const MaskContext = createContext<(Masker & { setTheme: (t: MaskTheme) => void }) | null>(null);

export function DemoMaskProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MaskTheme>("off");

  useEffect(() => {
    let t: string | null = null;
    try {
      t =
        new URLSearchParams(window.location.search).get("mask") ??
        window.localStorage.getItem(STORAGE_KEY);
    } catch {
      t = null;
    }
    if (t === "cola" || t === "pika" || t === "kpop" || t === "off") setThemeState(t);
  }, []);

  const setTheme = useCallback((t: MaskTheme) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo(() => ({ ...buildMasker(theme), setTheme }), [theme, setTheme]);
  return <MaskContext.Provider value={value}>{children}</MaskContext.Provider>;
}

const NO_MASK = { ...buildMasker("off"), setTheme: () => undefined };

export function useDemoMask() {
  return useContext(MaskContext) ?? NO_MASK;
}
