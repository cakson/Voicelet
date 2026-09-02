import { Firestore } from '@google-cloud/firestore';

export function createFirestoreClient(projectId: string): Firestore {
  return new Firestore({ projectId });
}

export async function disposeFirestoreClient(client: Firestore): Promise<void> {
  await client.terminate();
}
