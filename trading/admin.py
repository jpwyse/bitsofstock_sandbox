from django.contrib import admin
from .models import User, Cryptocurrency, Portfolio, Holding, Transaction

# Register your models here.
admin.site.register(User)
admin.site.register(Cryptocurrency)
admin.site.register(Portfolio)
admin.site.register(Holding)
admin.site.register(Transaction)
