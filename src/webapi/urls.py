from django.urls import path

from src.webapi.views import index

urlpatterns = [
    path("", index, name="index"),
]
