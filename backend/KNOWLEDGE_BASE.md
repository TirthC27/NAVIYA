# 🚀 QUICK START: Adding Knowledge to Your RAG System

## 📁 WHERE TO PUT YOUR DATASETS

```
backend/data/documents/
├── courses/          ← Course syllabi, curriculum PDFs
├── syllabi/          ← University course outlines  
├── tutorials/        ← Tutorial documents, guides
└── [any-folder]/     ← Organize as you like
```

---

## ✅ SUPPORTED FILE TYPES

- **PDF** (.pdf) - Course materials, books, research papers
- **Text** (.txt) - Notes, transcripts
- **Markdown** (.md) - Documentation, tutorials
- **CSV** (.csv) - Structured data, course listings

---

## 🔧 SETUP (ONE TIME)

### 1. Install Dependencies
```bash
cd backend
pip install chromadb sentence-transformers langchain langchain-community pypdf unstructured
```

### 2. Place Your Documents
```bash
# Example: Add a machine learning course PDF
backend/data/documents/courses/machine_learning_stanford.pdf

# Example: Add Python tutorial
backend/data/documents/tutorials/python_basics.txt

# Example: Add data structures syllabus
backend/data/documents/syllabi/cs_data_structures.md
```

### 3. Index Your Documents
```bash
cd backend
python -m app.rag.document_loader
```

**Output:**
```
📚 Loading documents from: ./data/documents
✅ Loaded PDF: machine_learning_stanford.pdf
✅ Loaded TXT: python_basics.txt
✅ Loaded MD: cs_data_structures.md
✅ Indexed 127 chunks from 3 documents
```

---

## 🎯 HOW IT WORKS

### **Before (Static)**
```
User: "I want to learn blockchain"
    ↓
LLM generates generic roadmap
    ↓
Results may not match your curriculum
```

### **After (Dynamic RAG)**
```
User: "I want to learn blockchain"
    ↓
1. RAG searches YOUR documents (blockchain_course.pdf)
    ↓
2. Extracts relevant syllabus/topics
    ↓
3. LLM generates roadmap using YOUR content
    ↓
4. YouTube videos match YOUR curriculum
```

---

## 📚 EXAMPLE DATASETS TO ADD

### **1. Course Syllabi**
```
blockchain_fundamentals.pdf
web_development_bootcamp.pdf
machine_learning_course_outline.pdf
```

### **2. Tutorial Transcripts**
```
python_crash_course.txt
react_hooks_tutorial.txt
sql_queries_guide.txt
```

### **3. Documentation**
```
tensorflow_guide.md
nodejs_best_practices.md
git_workflow.md
```

### **4. Structured Data**
```csv
# courses.csv
topic,subtopic,duration,difficulty
Python,Variables and Data Types,2,beginner
Python,Functions and Loops,3,beginner
Python,OOP Concepts,5,intermediate
```

---

## 🔍 TEST YOUR KNOWLEDGE BASE

```python
# Test search
from app.rag.document_loader import get_document_rag

rag = get_document_rag()
results = rag.search_knowledge("machine learning algorithms", n_results=3)

for result in results:
    print(f"Source: {result['source']}")
    print(f"Content: {result['content'][:200]}...")
```

---

## 🔄 UPDATE FLOW

**Adding New Documents:**
1. Copy files to `backend/data/documents/`
2. Run: `python -m app.rag.document_loader`
3. Restart backend: Backend will use new knowledge immediately

**No Restart Needed:**
- The RAG system loads on-demand
- Changes are available instantly after indexing

---

## 📊 EXAMPLE: Add Your Own Course

### **Step 1: Create a course document**

**File:** `backend/data/documents/courses/my_blockchain_course.txt`

```text
Blockchain Development Course Syllabus

Week 1: Introduction to Blockchain
- What is blockchain?
- Distributed ledger technology
- Consensus mechanisms (PoW, PoS)
- Public vs Private blockchains

Week 2: Cryptography Basics
- Hash functions (SHA-256)
- Digital signatures
- Public/private key cryptography
- Merkle trees

Week 3: Smart Contracts
- Introduction to Solidity
- Contract structure and syntax
- State variables and functions
- Events and modifiers

Week 4: Ethereum Development
- Setting up development environment
- Remix IDE and Truffle
- Deploying to testnet
- Web3.js integration

Week 5: DApp Development
- Frontend with React
- MetaMask integration
- Contract interaction
- IPFS for storage

Week 6: Advanced Topics
- Layer 2 solutions
- DeFi protocols
- NFT standards (ERC-721)
- Security best practices
```

### **Step 2: Index the document**
```bash
python -m app.rag.document_loader
```

### **Step 3: Test**
```bash
# Make API request
curl -X POST https://naviya-backend.onrender.com/generate-learning-plan \
  -H "Content-Type: application/json" \
  -d '{"user_topic": "blockchain development"}'
```

**Result:** Roadmap will now include YOUR course structure! ✅

---

## 🎓 PRO TIPS

### **1. Organize by Domain**
```
documents/
├── programming/
│   ├── python/
│   ├── javascript/
│   └── java/
├── data_science/
│   ├── machine_learning/
│   ├── statistics/
│   └── visualization/
└── design/
    ├── ui_ux/
    └── graphic_design/
```

### **2. Rich Document Names**
✅ Good: `python_web_scraping_beautifulsoup_tutorial.pdf`
❌ Bad: `doc1.pdf`

### **3. Add Metadata in Documents**
```text
Course: Advanced React Development
Level: Intermediate
Duration: 40 hours
Prerequisites: JavaScript ES6, Basic React

Topics:
- Hooks (useState, useEffect, custom hooks)
- Context API and state management
...
```

### **4. Update Regularly**
```bash
# Schedule weekly updates
cd backend
python -m app.rag.document_loader
```

---

## 🆘 TROUBLESHOOTING

**Error: "No documents found"**
- Check path: `backend/data/documents/`
- Verify file extensions (.pdf, .txt, .md, .csv)

**Error: "ChromaDB not installed"**
```bash
pip install chromadb sentence-transformers
```

**Documents not being used**
- Re-run indexer: `python -m app.rag.document_loader`
- Check console logs for "✅ Retrieved X knowledge chunks"

**Poor results**
- Add more detailed documents
- Use descriptive filenames
- Include structured content (headings, bullet points)

---

## 🚀 YOU'RE DONE!

Your system now uses **100% dynamic RAG** with **LangGraph orchestration**!

**Flow:**
1. User enters topic → 
2. RAG retrieves from YOUR documents → 
3. LLM generates roadmap using YOUR content → 
4. YouTube videos match YOUR curriculum → 
5. Perfect learning plan ✅

**No static files needed!** Just keep adding documents to `backend/data/documents/`
