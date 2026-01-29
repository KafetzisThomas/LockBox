from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from database import Base, engine
from routers import items, users

# create tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(items.router, prefix="/api/items", tags=["Items"])


@app.get("/", include_in_schema=False)
@app.get("/vault", include_in_schema=False)
def vault():
    pass


@app.get("/login", include_in_schema=False)
def login_page(request: Request):
    return templates.TemplateResponse("users/login.html", {"request": request})


@app.get("/register", include_in_schema=False)
def register_page(request: Request):
    return templates.TemplateResponse("users/register.html", {"request": request})


@app.get("/logout", include_in_schema=False)
def logout_page():
    pass
