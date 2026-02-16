"""Help article endpoints for AI Assist."""
import structlog
from fastapi import APIRouter, HTTPException, Query

from ..models import HelpArticle

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["articles"])

# In-memory knowledge base (replace with DB in production)
KNOWLEDGE_BASE: list[dict] = [
    {
        "id": "1",
        "slug": "getting-started",
        "title": "Getting Started with CrestDesk",
        "summary": "Learn the basics of navigating CrestDesk and setting up your account.",
        "content": "Welcome to CrestDesk! This guide covers the essential steps to get started...",
        "category": "onboarding",
        "feature_area": "general",
        "tags": ["setup", "onboarding", "basics"],
        "view_count": 0,
        "helpful_count": 0,
        "not_helpful_count": 0,
    },
    {
        "id": "2",
        "slug": "managing-transactions",
        "title": "Managing Real Estate Transactions",
        "summary": "How to create, track, and manage transactions through the pipeline.",
        "content": "Transactions are the core of CrestDesk. Each transaction represents a real estate deal...",
        "category": "transactions",
        "feature_area": "transactions",
        "tags": ["transactions", "deals", "pipeline", "closing"],
        "view_count": 0,
        "helpful_count": 0,
        "not_helpful_count": 0,
    },
    {
        "id": "3",
        "slug": "compliance-overview",
        "title": "Understanding Compliance in CrestDesk",
        "summary": "How CrestDesk helps you stay compliant with Fair Housing and state regulations.",
        "content": "CrestDesk automatically checks your content against federal and state compliance rules...",
        "category": "compliance",
        "feature_area": "compliance",
        "tags": ["compliance", "fair housing", "regulations", "RESPA"],
        "view_count": 0,
        "helpful_count": 0,
        "not_helpful_count": 0,
    },
    {
        "id": "4",
        "slug": "document-management",
        "title": "Document Management & E-Signing",
        "summary": "Upload, organize, and get documents signed electronically.",
        "content": "CrestDesk provides a complete document management system with e-signing capabilities...",
        "category": "documents",
        "feature_area": "documents",
        "tags": ["documents", "e-signing", "upload", "templates"],
        "view_count": 0,
        "helpful_count": 0,
        "not_helpful_count": 0,
    },
    {
        "id": "5",
        "slug": "billing-commissions",
        "title": "Billing & Commission Management",
        "summary": "Managing agent billing, commissions, and financial reports.",
        "content": "The Finance section provides tools for managing billing, commissions, and expenses...",
        "category": "finance",
        "feature_area": "finance",
        "tags": ["billing", "commissions", "finance", "invoices"],
        "view_count": 0,
        "helpful_count": 0,
        "not_helpful_count": 0,
    },
]


@router.get("/articles")
async def list_articles(
    category: str | None = Query(None),
    feature_area: str | None = Query(None),
):
    """List help articles with optional filters."""
    articles = KNOWLEDGE_BASE

    if category:
        articles = [a for a in articles if a["category"] == category]
    if feature_area:
        articles = [a for a in articles if a["feature_area"] == feature_area]

    return {"data": articles}


@router.get("/articles/search")
async def search_articles(q: str = Query(min_length=1)):
    """Search help articles by query string."""
    query_lower = q.lower()
    results = []

    for article in KNOWLEDGE_BASE:
        # Search in title, summary, content, and tags
        searchable = " ".join([
            article["title"],
            article["summary"],
            article["content"],
            " ".join(article["tags"]),
        ]).lower()

        if query_lower in searchable:
            results.append(article)

    return {"data": results}


@router.get("/articles/{slug}")
async def get_article(slug: str):
    """Get a help article by slug."""
    article = next((a for a in KNOWLEDGE_BASE if a["slug"] == slug), None)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Increment view count
    article["view_count"] += 1

    return {"data": article}


@router.post("/articles/{slug}/feedback")
async def article_feedback(slug: str, helpful: bool = True):
    """Submit feedback on a help article."""
    article = next((a for a in KNOWLEDGE_BASE if a["slug"] == slug), None)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if helpful:
        article["helpful_count"] += 1
    else:
        article["not_helpful_count"] += 1

    return {"data": article}


@router.get("/context-help")
async def context_help(page: str = Query(min_length=1)):
    """Get contextual help for a specific page."""
    page_lower = page.lower()

    # Map page paths to feature areas
    page_feature_map = {
        "transaction": "transactions",
        "contact": "contacts",
        "document": "documents",
        "compliance": "compliance",
        "finance": "finance",
        "billing": "finance",
        "social": "social",
        "email": "email",
    }

    feature_area = None
    for key, area in page_feature_map.items():
        if key in page_lower:
            feature_area = area
            break

    articles = [
        a for a in KNOWLEDGE_BASE
        if feature_area and a["feature_area"] == feature_area
    ]

    suggestions = [
        f"How do I manage {feature_area}?" if feature_area else "How can I help you?",
        "What are the compliance requirements?",
        "How do I contact support?",
    ]

    return {
        "data": {
            "page": page,
            "articles": articles,
            "suggestions": suggestions,
        }
    }
