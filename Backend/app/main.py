from fastapi import FastAPI

app = FastAPI(title="TeremNyilvantarto API")


@app.get("/")
def root():
    return {"message": "TeremNyilvantarto API működik"}
