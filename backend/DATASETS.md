# 📚 Adding Datasets to LearnTube AI

This guide explains where and how to add knowledge to enhance the AI's recommendations.

---

## 🎯 What Can You Add?

LearnTube AI uses **RAG (Retrieval Augmented Generation)** - you **don't train the model**, but you **enhance its knowledge base**.

---

## 📁 Dataset Locations

### **1. Simple Roadmaps (Static JSON)**

**Location**: `backend/data/roadmaps.json`

**When to use**: Quick additions for specific topics

**Example**:
```json
{
  "your-topic-name": {
    "title": "Display Title",
    "subtopics": [
      "Introduction and Basics",
      "Core Concepts",
      "Advanced Topics",
      "Practical Projects"
    ]
  }
}
```

**To add a new topic**:
1. Open `backend/data/roadmaps.json`
2. Add your topic following the format above
3. Restart the backend server
4. ✅ Done! The AI will now use this roadmap

---

### **2. Rich Learning Paths (With Metadata)**

**Location**: `backend/data/learning_paths.json`

**When to use**: Detailed course structures with prerequisites, difficulty levels

**Example**:
```json
{
  "topic": "Your Topic Name",
  "description": "What students will learn",
  "difficulty": "beginner|intermediate|advanced",
  "prerequisites": ["Required Knowledge 1", "Required Knowledge 2"],
  "subtopics": [
    {
      "title": "Subtopic 1",
      "description": "What this section covers",
      "duration_hours": 5
    }
  ]
}
```

**To add**:
1. Edit `backend/data/learning_paths.json`
2. Add your learning path to the array
3. Run the vector embedding script (see below)

---

### **3. Vector Database (Advanced RAG)**

**Location**: `backend/app/rag/vector_rag.py`

**When to use**: Large knowledge bases, semantic search, better matching

**Setup**:
```bash
# Install dependencies
cd backend
pip install chromadb sentence-transformers

# Load data into vector database
python -m app.rag.vector_rag
```

This creates `backend/data/chroma_db/` with vector embeddings for fast similarity search.

---

## 🚀 Usage Priority

The system searches in this order:

1. **Vector Database** (if available) - Best semantic matching
2. **Static Roadmaps** - Fast exact/partial matching
3. **LLM Generation** - Fallback for unknown topics

---

## 📝 Adding Your Own Data

### **Example: Add "Digital Marketing" Topic**

#### **Option A: Simple (roadmaps.json)**
```json
{
  "digital marketing": {
    "title": "Digital Marketing",
    "subtopics": [
      "Marketing Fundamentals",
      "SEO and Content Marketing",
      "Social Media Marketing",
      "Email Marketing and Automation",
      "Analytics and Conversion Optimization"
    ]
  }
}
```

#### **Option B: Detailed (learning_paths.json)**
```json
{
  "topic": "Digital Marketing",
  "description": "Complete guide to modern digital marketing strategies and tools",
  "difficulty": "beginner",
  "prerequisites": ["Basic Business Knowledge"],
  "subtopics": [
    {
      "title": "Marketing Fundamentals",
      "description": "Consumer behavior, market research, and marketing strategy",
      "duration_hours": 6
    },
    {
      "title": "SEO and Content Marketing",
      "description": "Search engine optimization, keyword research, content creation",
      "duration_hours": 10
    },
    {
      "title": "Social Media Marketing",
      "description": "Facebook, Instagram, LinkedIn, TikTok marketing strategies",
      "duration_hours": 8
    },
    {
      "title": "Paid Advertising",
      "description": "Google Ads, Facebook Ads, PPC campaigns and optimization",
      "duration_hours": 8
    },
    {
      "title": "Analytics and ROI",
      "description": "Google Analytics, conversion tracking, and performance metrics",
      "duration_hours": 6
    }
  ]
}
```

---

## 🔧 Advanced: Custom Data Sources

### **Add CSV/Excel Data**

Create a script to convert your data:

```python
# backend/scripts/import_topics.py
import json
import pandas as pd

# Read your CSV
df = pd.read_csv('your_topics.csv')

# Convert to learning_paths format
learning_paths = []
for _, row in df.iterrows():
    learning_paths.append({
        "topic": row['topic'],
        "description": row['description'],
        "difficulty": row['difficulty'],
        "subtopics": json.loads(row['subtopics_json'])
    })

# Save
with open('../data/learning_paths.json', 'w') as f:
    json.dump(learning_paths, f, indent=2)
```

### **Scrape Course Syllabi**

```python
# Example: Extract course structure from websites
import requests
from bs4 import BeautifulSoup

def scrape_course_syllabus(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Extract course modules (depends on website structure)
    modules = soup.find_all('div', class_='course-module')
    
    subtopics = []
    for module in modules:
        subtopics.append({
            "title": module.find('h3').text,
            "description": module.find('p').text,
            "duration_hours": 0  # Extract if available
        })
    
    return subtopics
```

---

## 📊 Testing Your Data

After adding data, test it:

```python
# Test roadmap retrieval
from app.rag.roadmap import get_learning_roadmap
import asyncio

async def test():
    roadmap = await get_learning_roadmap("your topic")
    print(roadmap)

asyncio.run(test())
```

Or use the API:
```bash
curl -X POST http://localhost:8000/generate-learning-plan \
  -H "Content-Type: application/json" \
  -d '{"user_topic": "your topic"}'
```

---

## 🎓 Best Practices

1. **Use clear, searchable topic names** (lowercase, use full terms)
2. **5-8 subtopics per roadmap** (good balance)
3. **Logical progression** (basics → advanced)
4. **Add metadata** when possible (difficulty, duration, prerequisites)
5. **Test semantic variations** ("machine learning" vs "ML" vs "AI")

---

## 📦 Backup Your Data

```bash
# Backup before making changes
cp backend/data/roadmaps.json backend/data/roadmaps.json.backup
cp backend/data/learning_paths.json backend/data/learning_paths.json.backup

# Backup vector database
cp -r backend/data/chroma_db backend/data/chroma_db.backup
```

---

## 🆘 Troubleshooting

**"Topic not found"**
- Check spelling in JSON files
- Ensure JSON is valid (use JSONLint.com)
- Restart backend server

**Vector RAG not working**
- Install: `pip install chromadb sentence-transformers`
- Run: `python -m app.rag.vector_rag` to load data
- Check `backend/data/chroma_db/` exists

**Poor recommendations**
- Add more detailed descriptions in `learning_paths.json`
- Increase vector search results: `n_results=5`
- Fine-tune subtopic descriptions for better YouTube matching
