import {ChatOllama} from "@langchain/community/chat_models/ollama";
import {memoryDb} from "@/lib/VectorStore";
import { LangChainAdapter } from 'ai';

export const maxDuration = 60; // Timeout plus long pour le streaming

export async function POST(req) {
    try {
        const {messages} = await req.json();
        
        // On récupère le dernier message de l'utilisateur
        const currentMessage = messages[messages.length - 1].content;
        
        // On récupère l'historique pour le contexte (les 5 derniers messages pour ne pas surcharger)
        const history = messages.slice(-6, -1).map(m => `${m.role}: ${m.content}`).join("\n");

        console.log("Question reçue:", currentMessage);

        // 1. Chercher les morceaux pertinents dans le PDF
        // On cherche en fonction de la dernière question
        const results = await memoryDb.similaritySearch(currentMessage, 3);
        
        const context = results.map(r => r.pageContent).join("\n\n");

        // 2. Préparer le modèle Ollama avec Streaming
        const model = new ChatOllama({
            model: "mistral", 
            baseUrl: "http://127.0.0.1:11434", // Force l'IP v4
            temperature: 0.7,
        });

        // 3. Créer le prompt avec Contexte + Historique + Question
        const prompt = `
            Tu es l'assistant Strate. Utilise les extraits du document ci-dessous et l'historique de la conversation pour répondre à la question de l'utilisateur.
            Si la réponse n'est pas dans le document, dis que tu ne sais pas.
            
            CONTEXTE DU DOCUMENT:
            ${context}
            
            HISTORIQUE DE LA CONVERSATION:
            ${history}
            
            QUESTION ACTUELLE:
            ${currentMessage}
            
            Réponds de manière concise et utile.
        `;

        // 4. Lancer le streaming
        const stream = await model.stream(prompt);

        // 5. Renvoyer la réponse en streaming vers le frontend
        return LangChainAdapter.toDataStreamResponse(stream);

    } catch (error) {
        console.error("Erreur dans /api/chat:", error);
        return new Response(JSON.stringify({ error: "Erreur de chat" }), { status: 500 });
    }
}