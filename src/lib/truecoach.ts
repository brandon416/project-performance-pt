import { env } from "./env.ts";

/**
 * TrueCoach API client.
 * Proxied server-side to bypass CORS and handle TLS issues.
 */

const TRUECOACH_API_BASE = "https://app.truecoach.co/proxy/api";

const defaultHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Role: "Trainer",
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest",
});

export interface TrueCoachClient {
  id: string;
  user_id: number;
  first_name: string;
  last_name: string;
}

export interface TrueCoachExercise {
  id: number;
  exercise_name: string;
  url?: string;
  description?: string;
}

export interface TrueCoachWorkout {
  id: number;
  due: string;
  title: string;
  client_id: string;
  hidden: boolean;
  workout_items: any[];
}

async function tcFetch(token: string, method: string, endpoint: string, body?: any) {
  const url = `${TRUECOACH_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: defaultHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`TrueCoach API error (${response.status}): ${errText}`);
  }

  return response.json();
}

export const truecoachService = {
  async getClients(token: string, trainerId?: string): Promise<{ clients: any[]; users: any[] }> {
    const tid = trainerId ?? env.TRUECOACH_TRAINER_ID;
    return tcFetch(token, "GET", `/trainers/${tid}/clients?state=active&page=1&per_page=100`);
  },

  async createExercise(
    token: string,
    name: string,
    url: string,
    description: string
  ): Promise<{ exercise: TrueCoachExercise }> {
    return tcFetch(token, "POST", "/exercises", {
      exercise: { exercise_name: name, url, description },
    });
  },

  async getWorkoutsForClient(token: string, clientId: string) {
    return tcFetch(token, "GET", `/v2/workouts?client_id=${clientId}&limit=50&page=1`);
  },

  async createWorkout(
    token: string,
    clientId: string,
    data: {
      exerciseName: string;
      exerciseId: number;
      videoUrl: string;
      exerciseCues: string;
      workoutDate: string;
      repsSets: string;
      hidden?: boolean;
    }
  ) {
    return tcFetch(token, "POST", "/workouts", {
      workout: {
        due: data.workoutDate,
        title: `Coaching: ${data.exerciseName}`,
        client_id: clientId,
        hidden: data.hidden ?? false,
        workout_items: [
          {
            name: data.exerciseName,
            exercise_id: data.exerciseId,
            video_url: data.videoUrl,
            description: data.exerciseCues,
            sets: data.repsSets,
            position: 0,
          },
        ],
      },
    });
  },

  async findClientByName(token: string, name: string, trainerId?: string) {
    const { clients, users } = await this.getClients(token, trainerId);
    const user = users?.find(
      (u: any) =>
        `${u.first_name} ${u.last_name}`.toLowerCase().trim() ===
        name.toLowerCase().trim()
    );
    if (!user) return null;
    return clients?.find((c: any) => c.user_id === user.id) ?? null;
  },

  /**
   * Full sync: Create exercise in library + assign to client workout.
   */
  async syncExerciseToWorkout(
    token: string,
    data: {
      exerciseName: string;
      videoUrl: string;
      exerciseCues: string;
      clientName: string;
      workoutDate: string;
      repsSets: string;
    },
    trainerId?: string
  ) {
    // 1. Create exercise in library
    const { exercise } = await this.createExercise(
      token,
      data.exerciseName,
      data.videoUrl,
      data.exerciseCues
    );

    // 2. Find client
    const client = await this.findClientByName(token, data.clientName, trainerId);
    if (!client) {
      throw new Error(`Client "${data.clientName}" not found in TrueCoach.`);
    }

    // 3. Create workout
    await this.createWorkout(token, client.id.toString(), {
      exerciseName: data.exerciseName,
      exerciseId: exercise.id,
      videoUrl: data.videoUrl,
      exerciseCues: data.exerciseCues,
      workoutDate: data.workoutDate,
      repsSets: data.repsSets,
    });

    return { exerciseId: exercise.id, clientId: client.id };
  },

  /**
   * +7 Day Auto-Copier: Clone last week's workouts to next week.
   */
  async shiftWorkouts(token: string, clientId: string, daysToShift = 7) {
    const data = await this.getWorkoutsForClient(token, clientId);
    const workouts = data.workouts ?? [];

    // Get workouts from the last 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentWorkouts = workouts.filter((w: any) => {
      const due = new Date(w.due);
      return due >= weekAgo && due <= now;
    });

    const results = [];
    for (const workout of recentWorkouts) {
      const oldDate = new Date(workout.due);
      const newDate = new Date(oldDate.getTime() + daysToShift * 24 * 60 * 60 * 1000);
      const newDateStr = newDate.toISOString().split("T")[0];

      const newWorkout = await tcFetch(token, "POST", "/workouts", {
        workout: {
          due: newDateStr,
          title: workout.title,
          client_id: clientId,
          hidden: true, // Always hidden for auto-copies
          workout_items: workout.workout_items?.map((item: any) => ({
            name: item.name,
            exercise_id: item.exercise_id,
            video_url: item.video_url,
            description: item.description,
            sets: item.sets,
            position: item.position,
          })),
        },
      });
      results.push(newWorkout);
    }

    return results;
  },
};
