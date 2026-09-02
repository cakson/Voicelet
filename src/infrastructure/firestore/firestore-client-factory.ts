import { Firestore } from '@google-cloud/firestore';

export function createFirestoreClient(projectId: string): Firestore {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulatorHost) {
    const separator = emulatorHost.lastIndexOf(':');
    const host = separator > 0 ? emulatorHost.slice(0, separator) : emulatorHost;
    const port = separator > 0 ? Number(emulatorHost.slice(separator + 1)) : 8080;
    if (host && Number.isInteger(port) && port > 0)
      return new Firestore({ projectId, servicePath: host, port, ssl: false });
  }
  return new Firestore({ projectId });
}

export async function disposeFirestoreClient(client: Firestore): Promise<void> {
  await client.terminate();
}
