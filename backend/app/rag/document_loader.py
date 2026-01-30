"""
Dynamic Document Loader for RAG
Loads PDFs, TXT, MD, CSV, DOCX files and creates vector embeddings
"""

import os
from pathlib import Path
from typing import List, Dict
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

# Document loaders
try:
    from langchain_community.document_loaders import (
        PyPDFLoader,
        TextLoader,
        CSVLoader,
        UnstructuredMarkdownLoader,
        DirectoryLoader
    )
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    print("⚠️ Install: pip install langchain langchain-community pypdf unstructured")


class DocumentRAG:
    """Load documents from files and create searchable knowledge base"""
    
    def __init__(self, persist_dir: str = "./data/chroma_db"):
        self.persist_dir = persist_dir
        
        # Initialize ChromaDB with sentence transformer embeddings
        self.client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=persist_dir
        ))
        
        # Use sentence transformers for embeddings
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        
        # Create collection
        self.collection = self.client.get_or_create_collection(
            name="learning_documents",
            embedding_function=self.embedding_function,
            metadata={"description": "Course documents, syllabi, and tutorials"}
        )
        
        # Text splitter for chunking large documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
    
    def load_documents_from_directory(self, directory: str) -> List[Dict]:
        """
        Load all documents from a directory
        Supports: PDF, TXT, MD, CSV
        """
        if not LANGCHAIN_AVAILABLE:
            print("❌ LangChain not installed. Cannot load documents.")
            return []
        
        documents = []
        directory_path = Path(directory)
        
        if not directory_path.exists():
            print(f"❌ Directory not found: {directory}")
            return []
        
        # Load PDFs
        for pdf_file in directory_path.glob("**/*.pdf"):
            try:
                loader = PyPDFLoader(str(pdf_file))
                docs = loader.load()
                for doc in docs:
                    doc.metadata["source_type"] = "pdf"
                    doc.metadata["filename"] = pdf_file.name
                documents.extend(docs)
                print(f"✅ Loaded PDF: {pdf_file.name}")
            except Exception as e:
                print(f"❌ Error loading {pdf_file.name}: {e}")
        
        # Load Text files
        for txt_file in directory_path.glob("**/*.txt"):
            try:
                loader = TextLoader(str(txt_file))
                docs = loader.load()
                for doc in docs:
                    doc.metadata["source_type"] = "text"
                    doc.metadata["filename"] = txt_file.name
                documents.extend(docs)
                print(f"✅ Loaded TXT: {txt_file.name}")
            except Exception as e:
                print(f"❌ Error loading {txt_file.name}: {e}")
        
        # Load Markdown files
        for md_file in directory_path.glob("**/*.md"):
            try:
                loader = UnstructuredMarkdownLoader(str(md_file))
                docs = loader.load()
                for doc in docs:
                    doc.metadata["source_type"] = "markdown"
                    doc.metadata["filename"] = md_file.name
                documents.extend(docs)
                print(f"✅ Loaded MD: {md_file.name}")
            except Exception as e:
                print(f"❌ Error loading {md_file.name}: {e}")
        
        # Load CSV files
        for csv_file in directory_path.glob("**/*.csv"):
            try:
                loader = CSVLoader(str(csv_file))
                docs = loader.load()
                for doc in docs:
                    doc.metadata["source_type"] = "csv"
                    doc.metadata["filename"] = csv_file.name
                documents.extend(docs)
                print(f"✅ Loaded CSV: {csv_file.name}")
            except Exception as e:
                print(f"❌ Error loading {csv_file.name}: {e}")
        
        return documents
    
    def index_documents(self, documents: List) -> int:
        """
        Split documents into chunks and add to vector database
        """
        if not documents:
            print("⚠️ No documents to index")
            return 0
        
        # Split documents into chunks
        chunks = self.text_splitter.split_documents(documents)
        
        # Prepare data for ChromaDB
        texts = [chunk.page_content for chunk in chunks]
        metadatas = [chunk.metadata for chunk in chunks]
        ids = [f"doc_{i}" for i in range(len(chunks))]
        
        # Add to vector database
        self.collection.add(
            documents=texts,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"✅ Indexed {len(chunks)} chunks from {len(documents)} documents")
        return len(chunks)
    
    def search_knowledge(self, query: str, n_results: int = 5) -> List[Dict]:
        """
        Search for relevant document chunks using vector similarity
        """
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        if not results['documents'][0]:
            return []
        
        # Format results
        matches = []
        for i, doc in enumerate(results['documents'][0]):
            metadata = results['metadatas'][0][i]
            distance = results['distances'][0][i] if 'distances' in results else None
            
            matches.append({
                "content": doc,
                "source": metadata.get('filename', 'unknown'),
                "source_type": metadata.get('source_type', 'unknown'),
                "similarity_score": 1 - distance if distance else None
            })
        
        return matches
    
    def load_all_documents(self, base_directory: str = "./data/documents"):
        """
        Load and index all documents from the base directory
        """
        print(f"📚 Loading documents from: {base_directory}")
        documents = self.load_documents_from_directory(base_directory)
        
        if documents:
            chunk_count = self.index_documents(documents)
            print(f"✅ Successfully indexed {chunk_count} chunks")
            return chunk_count
        else:
            print("⚠️ No documents found to index")
            return 0


# Singleton instance
_document_rag = None

def get_document_rag() -> DocumentRAG:
    """Get or create DocumentRAG instance"""
    global _document_rag
    if _document_rag is None:
        _document_rag = DocumentRAG()
    return _document_rag


# CLI Tool for indexing
if __name__ == "__main__":
    import sys
    
    print("🚀 LearnTube AI - Document Indexer")
    print("=" * 50)
    
    # Initialize RAG
    rag = DocumentRAG()
    
    # Load documents
    doc_dir = "./data/documents"
    if len(sys.argv) > 1:
        doc_dir = sys.argv[1]
    
    chunk_count = rag.load_all_documents(doc_dir)
    
    if chunk_count > 0:
        # Test search
        print("\n🔍 Testing search...")
        test_query = "machine learning tutorial"
        results = rag.search_knowledge(test_query, n_results=3)
        
        print(f"\nTop results for '{test_query}':")
        for i, result in enumerate(results, 1):
            print(f"\n{i}. Source: {result['source']}")
            print(f"   Type: {result['source_type']}")
            print(f"   Score: {result['similarity_score']:.3f}")
            print(f"   Content: {result['content'][:200]}...")
    
    print("\n✅ Indexing complete!")
