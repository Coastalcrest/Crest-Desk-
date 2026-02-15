import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import classify, extract, ocr, compliance

log = structlog.get_logger()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        docs_url="/docs" if settings.debug else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(classify.router, prefix="/api/classify", tags=["classify"])
    app.include_router(extract.router, prefix="/api/extract", tags=["extract"])
    app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])
    app.include_router(compliance.router, prefix="/api/compliance", tags=["compliance"])

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": settings.app_name}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
