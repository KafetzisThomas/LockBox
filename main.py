from fastapi import FastAPI
from database import Base, engine
from routers import items, users

app = FastAPI()

app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(items.router, prefix="/api/items", tags=["Items"])

# create tables automatically
Base.metadata.create_all(bind=engine)

@app.get("/", include_in_schema=False)
@app.get("/vault", include_in_schema=False)
def vault():
    pass


@app.get("/login", include_in_schema=False)
def login_page():
    pass


@app.get("/register", include_in_schema=False)
def register_page():
    pass

@app.get("/logout", include_in_schema=False)
def logout_page():
    pass
