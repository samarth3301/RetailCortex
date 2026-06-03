from fastapi import FastAPI

app = FastAPI(title="RetailCortex API")


@app.get("/health")
def health():
    return {"status": "ok"}
