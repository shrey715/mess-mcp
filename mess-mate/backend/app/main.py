from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, dashboard, settings, groups

app = FastAPI(title="Mess-Mate Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(settings.router, prefix="/api", tags=["Settings"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
