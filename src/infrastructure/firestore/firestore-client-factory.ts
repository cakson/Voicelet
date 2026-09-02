import { Firestore } from '@google-cloud/firestore';

export function createFirestoreClient(projectId: string): Firestore {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulatorHost) {
    const match = /^([^:]+):(\d+)$/.exec(emulatorHost);
    const host = match?.[1];
    const port = match ? Number(match[2]) : NaN;
    if (!host || !Number.isInteger(port) || port <= 0)
      throw new Error('Invalid Firestore emulator configuration.');
    return new Firestore({ projectId, servicePath: host, port, ssl: false });
  }
  return new Firestore({ projectId });
}

export async function disposeFirestoreClient(client: Firestore): Promise<void> {
  await client.terminate();
}
