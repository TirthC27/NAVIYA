"""
Vector embeddings for enhanced RAG using sentence transformers.
Install: pip install sentence-transformers chromadb
"""

import json
from pathlib import Path
from typing import List, Dict, Optional
import chromadb
from chromadb.config import Settings

# Optional: Use sentence transformers for better embeddings
try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    print("[WARN] sentence-transformers not installed. Using default embeddings.")


class VectorRAG:
    """Enhanced RAG with vector similarity search"""
    
    def __init__(self, collection_name: str = "learning_paths"):
        # Initialize ChromaDB (local persistent storage)
        self.client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory="./data/chroma_db"
        ))
        
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"description": "Learning paths knowledge base"}
        )
        
        # Load embeddings model if available
        if EMBEDDINGS_AVAILABLE:
            self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        else:
            self.embedder = None
    
    def load_knowledge_base(self, json_path: str = "./data/learning_paths.json"):
        """Load learning paths from JSON into vector database"""
        
        with open(json_path, 'r') as f:
            learning_paths = json.load(f)
        
        documents = []
        metadatas = []
        ids = []
        
        for idx, path in enumerate(learning_paths):
            # Create rich text representation for embedding
            doc_text = f"""
            Topic: {path['topic']}
            Description: {path['description']}
            Difficulty: {path['difficulty']}
            Prerequisites: {', '.join(path.get('prerequisites', []))}
            
            Learning Path:
            """
            
            for subtopic in path['subtopics']:
                doc_text += f"\n- {subtopic['title']}: {subtopic['description']}"
            
            documents.append(doc_text)
            metadatas.append({
                "topic": path['topic'],
                "difficulty": path['difficulty'],
                "subtopics": json.dumps([s['title'] for s in path['subtopics']])
            })
            ids.append(f"path_{idx}")
        
        # Add to vector database
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"[OK] Loaded {len(documents)} learning paths into vector database")
    
    def search_similar(self, query: str, n_results: int = 3) -> List[Dict]:
        """Search for similar learning paths using vector similarity"""
        
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        if not results['documents'][0]:
            return []
        
        matches = []
        for i, doc in enumerate(results['documents'][0]):
            metadata = results['metadatas'][0][i]
            distance = results['distances'][0][i] if 'distances' in results else None
            
            matches.append({
                "topic": metadata['topic'],
                "subtopics": json.loads(metadata['subtopics']),
                "difficulty": metadata['difficulty'],
                "similarity_score": 1 - distance if distance else None,
                "document": doc
            })
        
        return matches
    
    def get_roadmap_for_topic(self, topic: str) -> Optional[Dict]:
        """Get the best matching roadmap for a topic"""
        
        matches = self.search_similar(topic, n_results=1)
        
        if matches:
            best_match = matches[0]
            return {
                "title": best_match['topic'],
                "subtopics": best_match['subtopics'],
                "difficulty": best_match['difficulty']
            }
        
        return None


# Singleton instance
_vector_rag = None

def get_vector_rag() -> VectorRAG:
    """Get or create VectorRAG instance"""
    global _vector_rag
    if _vector_rag is None:
        _vector_rag = VectorRAG()
    return _vector_rag


# Example usage
if __name__ == "__main__":
    # Initialize and load data
    rag = VectorRAG()
    rag.load_knowledge_base()
    
    # Test search
    print("\n[SEARCH] Testing search for 'web development':")
    results = rag.search_similar("I want to learn web development", n_results=2)
    for r in results:
        print(f"  - {r['topic']} (difficulty: {r['difficulty']})")
        print(f"    Subtopics: {', '.join(r['subtopics'][:3])}...")
    
    print("\n[SEARCH] Testing search for 'AI and neural networks':")
    results = rag.search_similar("artificial intelligence neural networks", n_results=2)
    for r in results:
        print(f"  - {r['topic']} (difficulty: {r['difficulty']})")
