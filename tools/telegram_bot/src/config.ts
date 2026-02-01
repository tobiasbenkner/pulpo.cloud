function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const config = {
  botToken: requireEnv("BOT_TOKEN"),
  allowedUserIds: requireEnv("ALLOWED_USER_IDS")
    .split(",")
    .map((id) => Number(id.trim())),
  n8nWebhookUrl: requireEnv("N8N_WEBHOOK_URL"),
  pocketbaseUrl: requireEnv("POCKETBASE_URL"),
  pocketbaseEmail: requireEnv("POCKETBASE_EMAIL"),
  pocketbasePassword: requireEnv("POCKETBASE_PASSWORD"),
};
