export const config = () => {
  const token = process.env.TOKEN!;
  const clientId = process.env.clientId!;
  const prefix = "/";

  return { prefix, token, clientId };
};
