import {NextResponse} from "next/server";
import pdf from "pdf-parse";
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
import {memoryDb} from "@/lib/VectorStore";

export async function POST(req) {
    try {
        console.log("Début de l'ingestion...");
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            console.error("Aucun fichier reçu");
            return NextResponse.json({error: "Aucun fichier"}, {status: 400});
        }

        console.log(`Fichier reçu: ${file.name}, taille: ${file.size}`);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        console.log("Parsing du PDF...");
        const data = await pdf(buffer);
        console.log(`PDF parsé. Longueur du texte: ${data.text.length} caractères`);

        // 1. Découper le texte en morceaux gérables (Chunks)
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const docs = await splitter.createDocuments([data.text]);
        console.log(`Texte découpé en ${docs.length} morceaux.`);

        // 2. Ajouter ces documents à notre base en mémoire
        console.log("Ajout des documents à memoryDb (Ollama)...");
        await memoryDb.addDocuments(docs);
        console.log("Documents ajoutés avec succès !");

        return NextResponse.json({message: "Indexé avec succès !"});
    } catch (error) {
        console.error("Erreur lors de l'ingestion:", error);
        return NextResponse.json({error: "Erreur d'ingestion", details: error.message}, {status: 500});
    }
}