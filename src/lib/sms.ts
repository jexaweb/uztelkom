/**
 * SMS provider integration.
 * Configure SMS_API_URL + SMS_TOKEN in the environment.
 * Without configuration the system runs in simulation mode.
 */
export type SendResult = { ok: boolean; simulated?: boolean; error?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9;
}

export async function sendSms(phone: string, text: string): Promise<SendResult> {
  const url = process.env.SMS_API_URL;
  const token = process.env.SMS_TOKEN;
  if (!url || !token) {
    await sleep(200);
    return { ok: true, simulated: true };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, text }),
    });
    if (!res.ok) {
      return { ok: false, error: `SMS API xatoligi (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Tarmoq xatoligi" };
  }
}
