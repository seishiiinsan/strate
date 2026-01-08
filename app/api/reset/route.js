import { NextResponse } from "next/server";
import { memoryDb } from "@/lib/VectorStore";

export async function POST() {
    try {
        // On vide le tableau interne de MemoryVectorStore
        // C'est la méthode la plus efficace pour garder la même instance (Singleton) mais vide.
        if (memoryDb) {
            memoryDb.memoryVectors = [];
        }
        
        console.log("Base de données vectorielle vidée.");
        return NextResponse.json({ message: "Reset successful" });
    } catch (error) {
        console.error("Erreur lors du reset:", error);
        return NextResponse.json({ error: "Erreur lors du reset" }, { status: 500 });
    }
}