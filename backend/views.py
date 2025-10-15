import os
from django.views import View
from django.http import HttpResponse, HttpResponseNotFound
from django.views.generic import TemplateView
from django.views.decorators.cache import never_cache

# Create your views here.

index = never_cache(TemplateView.as_view(template_name='index.html', content_type='text/html'))