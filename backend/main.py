from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db.session import init_db
from backend.routers import health, incidents, campaigns

# Create FastAPI app
app = FastAPI(
    title="SentinelNet API",
    description="Privacy-preserving threat intelligence sharing for AI-enabled attacks",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Frontend dev server
        "http://localhost:3000",   # Frontend Docker container
        "http://localhost:3165",   # Frontend Docker mapped port
        "http://frontend:3000",    # Frontend service name in Docker network
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(incidents.router)
app.include_router(campaigns.router)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print("Database initialized")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SentinelNet API",
        "docs": "/docs",
        "health": "/health"
    }
