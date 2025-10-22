# settings.py (Heroku-ready, Channels + Redis, env-driven)

import os
from pathlib import Path
from datetime import timedelta

from decouple import config
from dotenv import load_dotenv, find_dotenv
import dj_database_url
import django_on_heroku

# -----------------------------
# Base & .env
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(find_dotenv())

def env_csv(name: str, default: str = "") -> list[str]:
    """Split a comma/space separated env string into a clean list."""
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]

# -----------------------------
# Core settings
# -----------------------------
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=True, cast=bool)

ALLOWED_HOSTS = env_csv("ALLOWED_HOSTS", "localhost,127.0.0.1")

# For CSRF and cookies on HTTPS origins (include your Heroku URL)
CSRF_TRUSTED_ORIGINS = env_csv(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:8000,http://127.0.0.1:8000,http://localhost:3000,http://127.0.0.1:3000",
)

# -----------------------------
# Installed apps
# -----------------------------
INSTALLED_APPS = [
    "daphne",  # ASGI server for Channels (ASGI_APPLICATION below)
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "django_extensions",
    "trading",
]

# -----------------------------
# Middleware
# -----------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# -----------------------------
# URLs / Templates / WSGI / ASGI
# -----------------------------
ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "build")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"   # for any WSGI needs (mgmt cmds, etc.)
ASGI_APPLICATION = "backend.asgi.application"   # Channels entrypoint


# -----------------------------
# Database
# -----------------------------
db_url = os.environ.get("DATABASE_URL", "").strip()

if db_url:
    # Use DATABASE_URL if provided (Heroku or local override)
    DATABASES = {
        "default": dj_database_url.parse(db_url, conn_max_age=600)
    }
    # Make sure sslmode quirks don't blow up
    options = DATABASES["default"].get("OPTIONS", {})
    options.pop("sslmode", None)
    if options:
        DATABASES["default"]["OPTIONS"] = options
else:
    # Fall back to SQLite when DATABASE_URL is not present (safe for local)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# -----------------------------
# Password validators
# -----------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# -----------------------------
# Internationalization / TZ
# -----------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# -----------------------------
# Static & Media (WhiteNoise)
# -----------------------------
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "build", "static"),  # if React build output lives here
    os.path.join(BASE_DIR, "public"),           # optional
]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# -----------------------------
# CORS
# -----------------------------
# Set explicit allowed origins via env (recommended)
CORS_ALLOWED_ORIGINS = env_csv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
CORS_ALLOW_CREDENTIALS = True

# -----------------------------
# Channels (WebSockets)
# -----------------------------
# Allowed origins for WebSocket connections (e.g., your Heroku app + local dev)
CHANNELS_WS_ALLOWED_ORIGINS = env_csv(
    "CHANNELS_WS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)

# Redis in prod (Heroku), InMemory in dev (or if REDIS_URL missing)
REDIS_URL = os.environ.get("REDIS_URL", "")

if DEBUG and not REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
else:
    # Use channels_redis in production (add Redis add-on on Heroku)
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                # channels_redis accepts a redis:// URL directly
                "hosts": [REDIS_URL or "redis://127.0.0.1:6379/0"],
            },
        },
    }

# -----------------------------
# Security (prod toggles)
# -----------------------------
if not DEBUG:
    SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Enable HSTS if desired (set to 0 to disable)
    SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "0"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = bool(int(os.environ.get("SECURE_HSTS_INCLUDE_SUBDOMAINS", "0")))
    SECURE_HSTS_PRELOAD = bool(int(os.environ.get("SECURE_HSTS_PRELOAD", "0")))
    # Proxy SSL header (Heroku router)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# -----------------------------
# External API keys (env)
# -----------------------------
COINGECKO_API_URL = "https://api.coingecko.com/api/v3"
COINGECKO_API_KEY = os.environ.get("COINGECKO_API_KEY", "")
FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "")

# -----------------------------
# Logging
# -----------------------------
LOG_LEVEL = os.getenv("DJANGO_LOG_LEVEL", "INFO")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "{levelname} {asctime} {module} {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": LOG_LEVEL},
    "loggers": {
        "django": {"handlers": ["console"], "level": LOG_LEVEL, "propagate": False},
        "trading": {"handlers": ["console"], "level": "DEBUG" if DEBUG else "INFO", "propagate": False},
        "asyncio": {"handlers": ["console"], "level": "WARNING"},
    },
}

# --------------------------------
# Heroku helper
# -----------------------------
# We manage static via WhiteNoise, so pass staticfiles=False
# Only apply Heroku tweaks when Heroku provides DATABASE_URL
if os.environ.get("DATABASE_URL"):
    django_on_heroku.settings(locals(), staticfiles=False)