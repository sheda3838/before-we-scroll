import { MongoClient, Collection, Db, GridFSBucket } from "mongodb";
import type { CompletionDocument } from "@/types/completion";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not configured.");
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      const client = new MongoClient(uri);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDatabase(dbName = "before-we-scroll"): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}

let indexesInitialized = false;

export async function getCompletionsCollection(): Promise<Collection<CompletionDocument>> {
  const db = await getDatabase();
  const collection = db.collection<CompletionDocument>("completions");

  // Lightweight one-time index initialization
  if (!indexesInitialized) {
    try {
      await collection.createIndex({ sessionId: 1 }, { background: true });
      await collection.createIndex({ "feedback.shareFeedbackPublicly": 1 }, { background: true });
      indexesInitialized = true;
    } catch {
      // Non-blocking: continue even if index already exists or fails
    }
  }

  return collection;
}

export async function getCompletionPhotosBucket(): Promise<GridFSBucket> {
  const db = await getDatabase();
  return new GridFSBucket(db, { bucketName: "completionPhotos" });
}

export default getClientPromise;
