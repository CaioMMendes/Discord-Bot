export const config = () => {
  const token = process.env.TOKEN!;
  const clientId = process.env.clientId!;
  const prefix = "/";

  return { prefix, token, clientId };
};

// IDs dos canais do painel de sons (suporta vários, separados por vírgula)
export const getSoundChannels = (): string[] =>
  (process.env.pituimSounds ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
