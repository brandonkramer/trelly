import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const profileSchema = z.object({
  apiKey: z.string().min(1),
  token: z.string().min(1),
  label: z.string().optional(),
});

const configSchema = z.object({
  version: z.literal(1),
  appApiKey: z.string().min(1).optional(),
  defaultProfile: z.string().min(1),
  profiles: z.record(z.string(), profileSchema),
});

export type Profile = z.infer<typeof profileSchema>;
export type Config = z.infer<typeof configSchema>;

const CONFIG_DIR = join(homedir(), ".config", "trello-cli");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export function configPath(): string {
  return CONFIG_PATH;
}

function emptyConfig(): Config {
  return { version: 1, defaultProfile: "default", profiles: {} };
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    return emptyConfig();
  }

  const raw = readFileSync(CONFIG_PATH, "utf8");
  return configSchema.parse(JSON.parse(raw));
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(CONFIG_PATH, 0o600);
}

export function resolveProfile(name?: string): {
  name: string;
  profile: Profile;
} {
  const fromEnv = process.env.TRELLO_PROFILE;
  const profileName = name ?? fromEnv ?? loadConfig().defaultProfile;

  const envKey = process.env.TRELLO_API_KEY;
  const envToken = process.env.TRELLO_TOKEN;
  if (envKey && envToken && !name && !fromEnv) {
    return {
      name: "env",
      profile: { apiKey: envKey, token: envToken, label: "environment" },
    };
  }

  const config = loadConfig();
  const profile = config.profiles[profileName];
  if (!profile) {
    const known = Object.keys(config.profiles);
    throw new Error(
      known.length === 0
        ? `No Trello profile "${profileName}". Run: trello auth login`
        : `Unknown profile "${profileName}". Known: ${known.join(", ")}`,
    );
  }

  return { name: profileName, profile };
}

export function upsertProfile(
  name: string,
  creds: Profile,
  makeDefault = false,
): Config {
  const config = loadConfig();
  config.profiles[name] = creds;
  if (makeDefault || Object.keys(config.profiles).length === 1) {
    config.defaultProfile = name;
  }
  saveConfig(config);
  return config;
}

export function removeProfile(name: string): Config {
  const config = loadConfig();
  if (!config.profiles[name]) {
    throw new Error(`Profile "${name}" does not exist`);
  }
  delete config.profiles[name];
  const remaining = Object.keys(config.profiles);
  if (remaining.length === 0) {
    config.defaultProfile = "default";
  } else if (config.defaultProfile === name) {
    config.defaultProfile = remaining[0]!;
  }
  saveConfig(config);
  return config;
}

export function setDefaultProfile(name: string): Config {
  const config = loadConfig();
  if (!config.profiles[name]) {
    throw new Error(`Profile "${name}" does not exist`);
  }
  config.defaultProfile = name;
  saveConfig(config);
  return config;
}

export function setAppApiKey(apiKey: string): Config {
  const config = loadConfig();
  config.appApiKey = apiKey;
  saveConfig(config);
  return config;
}

export function getAppApiKey(): string | undefined {
  return process.env.TRELLO_APP_API_KEY ?? loadConfig().appApiKey;
}

export type AuthScope = "read" | "write" | "account";

export type AuthUrlOptions = {
  returnUrl?: string;
  expiration?: "1hour" | "1day" | "30days" | "never";
  scope?: AuthScope[];
  appName?: string;
};

export function authLoginUrl(apiKey: string, opts: AuthUrlOptions = {}): string {
  const scope = opts.scope ?? ["read", "write"];
  const params = new URLSearchParams({
    key: apiKey,
    name: opts.appName ?? "trello-cli",
    expiration: opts.expiration ?? "30days",
    response_type: "token",
    scope: scope.join(","),
  });
  if (opts.returnUrl) {
    params.set("callback_method", "fragment");
    params.set("return_url", opts.returnUrl);
  }
  return `https://trello.com/1/authorize?${params}`;
}
