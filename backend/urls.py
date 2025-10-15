from django.contrib import admin
from django.urls import path, include, re_path
from django.shortcuts import render
from django.conf.urls.static import static
from django.conf import settings
from django.views.generic import TemplateView
from .router import api
from .views import index

# Create your urls here.

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
    path('', index, name='index'),
] + static('/media/', document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
