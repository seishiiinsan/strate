import {MemoryVectorStore} from "langchain/vectorstores/memory";
import {OllamaEmbeddings} from "@langchain/community/embeddings/ollama";

// Utilisation d'Ollama pour les embeddings (local)
const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://127.0.0.1:11434", // Force l'IP v4 pour éviter les problèmes DNS sur macOS
});

// Singleton pour éviter que la DB soit effacée à chaque rechargement en mode dev
const globalForVectorStore = global;

if (!globalForVectorStore.memoryDb) {
    globalForVectorStore.memoryDb = new MemoryVectorStore(embeddings);
}

export const memoryDb = globalForVectorStore.memoryDb;