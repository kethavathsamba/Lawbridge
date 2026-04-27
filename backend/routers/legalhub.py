"""Legal Hub: sections, guides, and case files.

Option 1: Live-fetch mode (no MongoDB writes/reads).

Set optional env vars to point to JSON sources:
- LEGALHUB_SECTIONS_URL
- LEGALHUB_ARTICLES_URL
- LEGALHUB_CASEFILES_URL

Each URL should return JSON arrays in the response schemas below. If URLs are not set,
the API serves a small in-memory sample dataset.
"""

import json
import os
import urllib.request
import urllib.parse
import re
import html
from fastapi import APIRouter, Query

router = APIRouter(prefix="/legalhub", tags=["legalhub"])


SAMPLE_SECTIONS = [
    {
        "id": "sec_criminal",
        "slug": "criminal-law",
        "title": "Criminal Law",
        "icon": "alert-triangle",
        "color": "#ef4444",
        "description": "FIR, bail, arrest procedures, investigations, trials, and key rights during criminal proceedings.",
    },
    {
        "id": "sec_consumer",
        "slug": "consumer-rights",
        "title": "Consumer Rights",
        "icon": "shield-check",
        "color": "#10b981",
        "description": "Deficiency of service, refunds, warranties, online complaints, and consumer forum procedures.",
    },
    {
        "id": "sec_property",
        "slug": "property-law",
        "title": "Property Disputes",
        "icon": "scale",
        "color": "#f59e0b",
        "description": "Title, possession, documentation checks, injunctions, and common property dispute pathways.",
    },
    {
        "id": "sec_family",
        "slug": "family-law",
        "title": "Family Law",
        "icon": "book-open",
        "color": "#3b82f6",
        "description": "Marriage, divorce, maintenance, custody, domestic violence remedies, and family court timelines.",
    },
]

SAMPLE_ARTICLES = [
    {
        "id": "art_1",
        "sectionId": "sec_criminal",
        "title": "Step-by-Step Guide to Filing an FIR in India",
        "subCategory": "Criminal Process",
        "readTimeMin": 5,
        "tags": ["FIR", "Police", "CrPC"],
        "publishedOn": "Jan 2026",
    },
    {
        "id": "art_2",
        "sectionId": "sec_criminal",
        "title": "Rights During Police Interrogation (India)",
        "subCategory": "Citizen Rights",
        "readTimeMin": 8,
        "tags": ["Rights", "Custody"],
        "publishedOn": "Jan 2026",
    },
    {
        "id": "art_3",
        "sectionId": "sec_consumer",
        "title": "How to File a Consumer Complaint Online",
        "subCategory": "Consumer Forums",
        "readTimeMin": 6,
        "tags": ["Consumer Court", "E-commerce"],
        "publishedOn": "Sep 2025",
    },
]

SAMPLE_CASE_FILES = [
    {
        "id": "case_1",
        "sectionId": "sec_criminal",
        "title": "FIR Registration Principles",
        "court": "Supreme Court of India",
        "year": 2013,
        "citation": "Lalita Kumari v. Govt of UP",
        "summary": "When police must register FIR; preliminary inquiry rules for limited categories.",
        "keywords": ["FIR", "Police", "Registration"],
    }
]


def _fetch_json_array(url: str):
    with urllib.request.urlopen(url, timeout=20) as resp:
        raw = resp.read().decode("utf-8")
    data = json.loads(raw)
    return data if isinstance(data, list) else []


def _ik_api_token() -> str | None:
    return os.getenv("INDIANKANOON_TOKEN") or None


def _ik_request_json(path: str) -> dict:
    token = _ik_api_token()
    if not token:
        return {}
    req = urllib.request.Request(
        f"https://api.indiankanoon.org{path}",
        headers={
            "Authorization": f"Token {token}",
            "Accept": "application/json",
            "User-Agent": "lawbridge/1.0 (+legalhub)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        raw = resp.read().decode("utf-8")
    return json.loads(raw) if raw else {}


def _ik_search(form_input: str, pagenum: int = 0) -> dict:
    qs = {"formInput": form_input, "pagenum": str(pagenum)}
    return _ik_request_json("/search/?" + urllib.parse.urlencode(qs))

def _ik_docmeta(doc_id: str) -> dict:
    return _ik_request_json(f"/docmeta/{urllib.parse.quote(doc_id)}/")


_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(s: str | None) -> str:
    if not s:
        return ""
    # Indian Kanoon returns some fields (eg headline) as HTML.
    s = html.unescape(s)
    s = _TAG_RE.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def _source_sections():
    url = os.getenv("LEGALHUB_SECTIONS_URL")
    return _fetch_json_array(url) if url else SAMPLE_SECTIONS


def _source_articles():
    url = os.getenv("LEGALHUB_ARTICLES_URL")
    return _fetch_json_array(url) if url else SAMPLE_ARTICLES


def _source_case_files():
    url = os.getenv("LEGALHUB_CASEFILES_URL")
    return _fetch_json_array(url) if url else SAMPLE_CASE_FILES


def _section_out(s):
    return {
        "id": s.get("id") or s.get("_id") or "",
        "slug": s.get("slug"),
        "title": s.get("title"),
        "icon": s.get("icon"),
        "color": s.get("color"),
        "description": s.get("description"),
    }


def _article_out(a):
    return {
        "id": a.get("id") or a.get("_id") or "",
        "sectionId": a.get("sectionId"),
        "title": a.get("title"),
        "subCategory": a.get("subCategory"),
        "readTimeMin": a.get("readTimeMin"),
        "tags": a.get("tags") or [],
        "publishedOn": a.get("publishedOn"),
    }


def _case_out(c):
    return {
        "id": c.get("id") or c.get("_id") or "",
        "sectionId": c.get("sectionId"),
        "title": c.get("title"),
        "court": c.get("court"),
        "year": c.get("year"),
        "citation": c.get("citation"),
        "summary": c.get("summary"),
        "keywords": c.get("keywords") or [],
    }


@router.get("/sections")
def list_sections():
    sections = _source_sections()
    return [_section_out(s) for s in sorted(sections, key=lambda x: (x.get("title") or ""))]


@router.get("/articles")
def list_articles(
    sectionId: str | None = Query(None),
    q: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    term = (q or "").strip().lower()
    items = _source_articles()
    out = []
    for a in items:
        if sectionId and a.get("sectionId") != sectionId:
            continue
        if term:
            hay = " ".join([str(a.get("title") or ""), str(a.get("subCategory") or ""), " ".join(a.get("tags") or [])]).lower()
            if term not in hay:
                continue
        out.append(_article_out(a))
        if len(out) >= limit:
            break
    return out


@router.get("/case-files")
def list_case_files(
    sectionId: str | None = Query(None),
    q: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    # If configured, use Indian Kanoon live search for "case files"
    token = _ik_api_token()
    if token and q and not os.getenv("LEGALHUB_CASEFILES_URL"):
        data = _ik_search(q, pagenum=0)
        docs = data.get("docs") or []
        out = []
        for d in docs[:limit]:
            out.append(
                {
                    "id": str(d.get("tid") or ""),
                    "sectionId": sectionId or "indiankanoon",
                    "title": _strip_html(d.get("title")),
                    "court": _strip_html(d.get("docsource")),
                    "year": None,
                    "citation": None,
                    "summary": _strip_html(d.get("headline")),
                    "keywords": [q],
                }
            )
        return out

    term = (q or "").strip().lower()
    items = _source_case_files()
    out = []
    for c in items:
        if sectionId and c.get("sectionId") != sectionId:
            continue
        if term:
            hay = " ".join(
                [
                    str(c.get("title") or ""),
                    str(c.get("court") or ""),
                    str(c.get("citation") or ""),
                    str(c.get("summary") or ""),
                    " ".join(c.get("keywords") or []),
                ]
            ).lower()
            if term not in hay:
                continue
        out.append(_case_out(c))
        if len(out) >= limit:
            break
    return out


@router.get("/case-files/{doc_id}")
def case_file_details(doc_id: str):
    token = _ik_api_token()
    if not token:
        return {}
    meta = _ik_docmeta(doc_id) or {}
    # meta fields vary; normalize a safe subset
    out = {
        "id": str(meta.get("tid") or doc_id),
        "title": _strip_html(meta.get("title")),
        "docsource": _strip_html(meta.get("docsource")),
        "publishdate": meta.get("publishdate"),
        "bench": _strip_html(meta.get("bench")),
        "author": _strip_html(meta.get("author")),
        "citation": _strip_html(meta.get("citation")),
        "numcites": meta.get("numcites"),
        "numcitedby": meta.get("numcitedby"),
        "url": f"https://indiankanoon.org/doc/{doc_id}/",
    }
    return out
