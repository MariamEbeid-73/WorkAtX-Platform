import * as signalR from "@microsoft/signalr";
import { config } from "../config";

export interface JobStatusUpdate {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  stage: string | null;
  progress: number | null;
  error: string | null;
  timestamp: string;
}

let connection: signalR.HubConnection | null = null;
let connectingPromise: Promise<signalR.HubConnection> | null = null;

async function getConnection(
  getToken: () => Promise<string | null>,
): Promise<signalR.HubConnection> {
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    return connection;
  }
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${config.apiUrl}/hubs/job-status`, {
        accessTokenFactory: async () => (await getToken()) || "",
      })
      .withAutomaticReconnect()
      .build();

    await hub.start();
    connection = hub;
    connectingPromise = null;
    return hub;
  })();

  return connectingPromise;
}

/** Subscribes to one job's updates. Returns an unsubscribe function. */
export async function subscribeToJob(
  getToken: () => Promise<string | null>,
  jobId: string,
  onUpdate: (update: JobStatusUpdate) => void,
): Promise<() => void> {
  const hub = await getConnection(getToken);
  const handler = (update: JobStatusUpdate) => {
    if (update.jobId === jobId) onUpdate(update);
  };
  hub.on("job_status_update", handler);
  await hub.invoke("SubscribeToJob", jobId);
  return () => hub.off("job_status_update", handler);
}
