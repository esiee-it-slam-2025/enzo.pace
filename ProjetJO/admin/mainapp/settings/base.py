import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Pensez à générer une nouvelle clé à l'aide de https://djecrety.ir/
SECRET_KEY = "velicyjh0)jmde&@qj=_)hzik!&sw4ml8b92ni&!y@=cu(-hj8"

INSTALLED_APPS = [
    "corsheaders",
    "mainapp.apps.MainappConfig",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    'rest_framework',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Doit être en premier
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# URLs déclarées dans mainapp.urls
ROOT_URLCONF = "mainapp.urls"

WSGI_APPLICATION = "mainapp.wsgi.application"

# Templates
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],  # Dossier contenant les templates HTML
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

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": "jo_project_starter",
        "USER": "root",
        "PASSWORD": "root",
        "HOST": "127.0.0.1",
        "PORT": "3306",
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "UTC"
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Gestion des fichiers statiques
STATIC_URL = "/static/"
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "static"),
]

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Gestion des autorisations et CORS
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    "http://127.0.0.1:5500",  # Adresse URL local sur le port Live Server
    "http://localhost:5500",  # Alternative locale
]
ALLOWED_HOSTS = [
    "127.0.0.1",  # Pour les tests en local
    "localhost",  # Alternative locale
]

# ✅ Configuration de l'authentification
LOGIN_URL = "/"  # La page de connexion est la première page affichée
LOGIN_REDIRECT_URL = "/admin/dashboard/"  # Redirection après connexion
LOGOUT_REDIRECT_URL = "/"  # Redirection après déconnexion


# Dossier où Django cherche les fichiers statiques
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "static"),  # Assurez-vous que le dossier static est bien déclaré
]

# URL pour servir les fichiers statiques
STATIC_URL = "/static/"

# Où Django collecte les fichiers statiques après collectstatic
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")