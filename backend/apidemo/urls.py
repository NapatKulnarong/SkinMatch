"""
URL configuration for apidemo project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from django.shortcuts import redirect
from ninja import NinjaAPI

api = NinjaAPI()

@api.get("/add")
def add(request, a: int, b: int):
    return {"result": a + b}

@api.get("/")
def api_root(request):
    return {"message": "Welcome to the API!"}

def root_home(request):
    return JsonResponse({"message": "Welcome to the API root! by JsonResponse"})

@api.get("/homepage")
def homepage(request):
    return {
        "hero": {"title": "Your Skin, Your Match", "subtitle": "Personalized skincare starts here.", "ctaText": "Get Started"},
        "highlights": [
            {"id": "h1", "title": "Skin Profile", "blurb": "Tell us your skin type & concerns", "href": "/profile"},
            {"id": "h2", "title": "Compatibility Check", "blurb": "See what works well together", "href": "/checker"},
            {"id": "h3", "title": "Routine Builder", "blurb": "Build AM/PM steps in minutes", "href": "/routine"},
        ],
        "featuredProducts": [
            {"id": "p1", "name": "Gentle Cleanser", "price": 299, "imageUrl": "/img/placeholder.png"},
            {"id": "p2", "name": "Hydrating Serum", "price": 499, "imageUrl": "/img/placeholder.png"},
            {"id": "p3", "name": "Daily Sunscreen SPF50", "price": 399, "imageUrl": "/img/placeholder.png"},
        ],
    }

urlpatterns = [
    path("", root_home, name="root_home"),
    path("admin/", admin.site.urls),
    path("api/", api.urls),
]
