import { env } from "./env.ts";

/**
 * Acuity Scheduling API client.
 * Used for fetching patient appointments.
 */

const ACUITY_API_BASE = "https://acuityscheduling.com/api/v1";

function getAcuityHeaders() {
  if (!env.ACUITY_USER_ID || !env.ACUITY_API_KEY) {
    throw new Error("Acuity credentials not configured");
  }
  const credentials = Buffer.from(`${env.ACUITY_USER_ID}:${env.ACUITY_API_KEY}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

export interface AcuityAppointment {
  id: number;
  firstName: string;
  lastName: string;
  datetime: string;
  endTime: string;
  type: string;
  duration: string;
  canceled: boolean;
}

export const acuityService = {
  async getAppointments(params?: {
    minDate?: string;
    maxDate?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AcuityAppointment[]> {
    const query = new URLSearchParams();
    if (params?.minDate) query.set("minDate", params.minDate);
    if (params?.maxDate) query.set("maxDate", params.maxDate);
    if (params?.firstName) query.set("firstName", params.firstName);
    if (params?.lastName) query.set("lastName", params.lastName);

    const url = `${ACUITY_API_BASE}/appointments?${query.toString()}`;
    const response = await fetch(url, { headers: getAcuityHeaders() });

    if (!response.ok) {
      throw new Error(`Acuity API error: ${response.status}`);
    }

    return response.json();
  },

  async getMostRecentAppointment(clientName: string): Promise<AcuityAppointment | null> {
    const [firstName, ...lastParts] = clientName.split(" ");
    const lastName = lastParts.join(" ");

    const appointments = await this.getAppointments({
      firstName,
      lastName,
      maxDate: new Date().toISOString().split("T")[0],
    });

    // Sort by date descending, return most recent
    const sorted = appointments
      .filter((a) => !a.canceled)
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    return sorted[0] ?? null;
  },

  async getNextAppointment(clientName: string): Promise<AcuityAppointment | null> {
    const [firstName, ...lastParts] = clientName.split(" ");
    const lastName = lastParts.join(" ");

    const appointments = await this.getAppointments({
      firstName,
      lastName,
      minDate: new Date().toISOString().split("T")[0],
    });

    const sorted = appointments
      .filter((a) => !a.canceled)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

    return sorted[0] ?? null;
  },
};
