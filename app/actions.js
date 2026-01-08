'use server'

import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
import {memoryDb} from "@/lib/VectorStore";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";

export async function ingestDocument(formData) {
    try {
        console.log("Début de l'ingestion (Server Action)...");
        const file = formData.get("file");

        if (!file) {
            return { error: "Aucun fichier reçu" };
        }

        console.log(`Fichier reçu: ${file.name}, taille: ${file.size}`);

        // On convertit le fichier en Blob (Web Standard)
        const blob = new Blob([await file.arrayBuffer()], { type: "application/pdf" });

        console.log("Parsing du PDF avec WebPDFLoader...");
        
        // Utilisation du loader Web de LangChain qui utilise pdfjs-dist (plus robuste)
        const loader = new WebPDFLoader(blob, {
            splitPages: false, 
        });
        
        const rawDocs = await loader.load();
        const fullText = rawDocs.map(d => d.pageContent).join("\n\n");
        
        console.log(`PDF parsé. Longueur du texte: ${fullText.length} caractères`);
        
        // 1. Découper le texte
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const docs = await splitter.createDocuments([fullText]);
        console.log(`Texte découpé en ${docs.length} morceaux.`);

        // 2. Ajouter à memoryDb
        console.log("Ajout des documents à memoryDb...");
        await memoryDb.addDocuments(docs);
        console.log("Documents ajoutés avec succès !");

        return { success: true, message: "Indexé avec succès !" };
    } catch (error) {
        console.error("Erreur Server Action:", error);
        return { error: "Erreur d'ingestion", details: error.message };
    }
}

export async function resetMemory() {
    try {
        if (memoryDb) {
            memoryDb.memoryVectors = [];
        }
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

// Nouvelle fonction pour vérifier si Ollama est en ligne
export async function checkOllamaStatus() {
    try {
        // On tente de contacter l'API tags d'Ollama (très légère)
        const res = await fetch("http://127.0.0.1:11434/api/tags", { 
            method: 'GET',
            cache: 'no-store' 
        });
        return res.ok;
    } catch (error) {
        return false;
    }
}