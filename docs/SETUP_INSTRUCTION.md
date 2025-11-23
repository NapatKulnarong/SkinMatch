# =========================================
# SkinMatch Backend Requirements
# Compatible with: macOS, Windows, Linux
# Python: 3.11+
# =========================================

# Core Django & Web Framework
cryptography>=42                              # Security library (both macOS & Windows)
dj-database-url>=2.1.0                       # Database URL parser (both macOS & Windows)
django>=5.0                                   # Django web framework (both macOS & Windows)
django-allauth>=0.61.0,<0.62.0              # Authentication & social login (both macOS & Windows)
django-cors-headers==4.4.0                   # CORS support (both macOS & Windows)
django-ninja==1.4.5                          # FastAPI-like Django routing (both macOS & Windows)
django-ninja-extra>=0.19.1                   # Extended Ninja features (both macOS & Windows)
djangorestframework>=3.15.0,<3.16.0         # REST API framework (both macOS & Windows)
djangorestframework-simplejwt>=5.3.1,<6.0.0 # JWT authentication (both macOS & Windows)

# Utilities & Validators
email-validator>=2.0.0                       # Email validation (both macOS & Windows)
python-dotenv>=1.0.1                         # Environment variable loader (both macOS & Windows)
requests>=2.32.0,<3.0                        # HTTP library (both macOS & Windows)
bleach>=6.1.0,<7.0.0                        # HTML sanitizer (both macOS & Windows)

# Authentication & Security
google-auth>=2.32.0,<3.0                     # Google authentication (both macOS & Windows)
google-generativeai                          # Google Generative AI / Gemini API (both macOS & Windows)
PyJWT~=2.9                                   # JWT token handling (both macOS & Windows)

# Data Processing & Serialization
pydantic==2.12.3                             # Data validation (both macOS & Windows)

# Image Processing
Pillow>=10.4.0,<11.0.0                       # Image manipulation (both macOS & Windows)
pillow-heif>=0.14.0                          # HEIF image support (both macOS & Windows)

# Database
psycopg[binary]>=3.2                         # PostgreSQL adapter with binary wheel (both macOS & Windows)

# Server & ASGI
gunicorn>=22.0.0,<23.0.0                     # Production WSGI server (both macOS & Windows)
uvicorn[standard]>=0.30.0,<0.31.0           # ASGI server (both macOS & Windows)
whitenoise==6.7.0                            # Static file serving (both macOS & Windows)

# Testing
pytest                                       # Testing framework (both macOS & Windows)
pytest-django                                # Django testing plugin (both macOS & Windows)

# =========================================
# Platform-Specific Notes:
# 
# MACOS:
# - Most packages install without issues
# - May need to install Xcode Command Line Tools for some native extensions
# - Run: xcode-select --install
#
# WINDOWS:
# - All packages use pre-built binary wheels
# - Removed packages requiring C/C++ compilation (numpy, opencv)
# - If build errors occur, ensure pip uses --prefer-binary flag
# =========================================