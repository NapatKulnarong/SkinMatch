from ninja import NinjaAPI, Schema, ModelSchema
from .models import UserProfile
from typing import List, Optional
from pydantic import ConfigDict
from .auth import create_access_token, JWTAuth
import uuid
from datetime import datetime
from django.contrib.auth import authenticate, login, logout, get_user_model

api = NinjaAPI()
User = get_user_model()

class LoginIn(Schema):
    identifier: str
    password: str
class tokenOut(Schema):
    ok: bool
    token: Optional[str] = None
    message: str

class ProfileOut(Schema):
    model_config = ConfigDict(from_attributes=True)  # allow model instances
    u_id: uuid.UUID
    display_name: Optional[str] = None
    contact_email: Optional[str] = None
    is_verified: bool
    created_at: datetime

class UserProfileSchema(ModelSchema):
    class Config:
        model = UserProfile
        model_fields = ['u_id', 'display_name', 'contact_email', 'is_verified', 'created_at']
        
# ------------------------------------------------------------------------------------
@api.post("/auth/token", response=tokenOut)
def token_login(request, payload: LoginIn):
    # accept either username or email as identifier
    identifier = payload.identifier.strip()
    username = identifier
    if "@" in identifier:
        try:
            user_obj = User.objects.get(email__iexact=identifier)
            username = user_obj.get_username()
        except User.DoesNotExist:
            return {"ok": False, "message": "Invalid credentials"}

    user = authenticate(request, username=username, password=payload.password)
    if not user:
        return {"ok": False, "message": "Invalid credentials"}

    token = create_access_token(user)
    return {"ok": True, "token": token, "message": "Login successful"}

@api.post("/auth/logout", response=tokenOut, auth=JWTAuth())
def token_logout(request):
    # Stateless JWT: nothing to revoke on the server by default.
    # Client should delete stored token.
    return {"ok": True, "token": None, "message": "Logged out (token discarded client-side)"}

@api.get("/auth/me", response=ProfileOut, auth=JWTAuth())
def me_view(request):
    # request.auth is the authenticated User object (from JWTAuth)
    user: User = request.auth
    profile, _ = UserProfile.objects.select_related("user").get_or_create(user=user)
    # merge profile + user fields
    return {
        "u_id": profile.u_id,
        "display_name": profile.display_name,
        "contact_email": profile.contact_email or user.email,
        "is_verified": profile.is_verified,
        "created_at": profile.created_at,
        "username": user.get_username(),
        "email": user.email,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }

@api.get("/users", response=List[ProfileOut], auth=JWTAuth())
def list_users(request, limit: int = 50, offset: int = 0):
    qs = UserProfile.objects.select_related("user").order_by("created_at")[offset:offset+limit]
    return [
        {
            "u_id": p.u_id,
            "display_name": p.display_name,
            "contact_email": p.contact_email or p.user.email,
            "is_verified": p.is_verified,
            "created_at": p.created_at,
            "username": p.user.username,
            "email": p.user.email,
            "is_staff": p.user.is_staff,
            "is_superuser": p.user.is_superuser,
        }
        for p in qs
    ]
# ------------------------------------------------------------------------------------
@api.get("/hello")
def api_root(request):
    print(request)
    return {"message": "Welcome to the API!"}

# @api.get("/users", response=List[UserProfileSchema])
# def list_users(request):
#     profiles = UserProfile.objects.select_related("user").all()
#     return [
#         {
#             "u_id": p.u_id,
#             "username": p.user.username,
#             "email": p.user.email,
#             "display_name": p.display_name,
#             "contact_email": p.contact_email,
#             "is_verified": p.is_verified,
#             "created_at": p.created_at,
#         }
#         for p in profiles
#     ]

# @api.post("/auth/login")
# def login_view(request, payload: LoginIn):
#     # STEP 1: figure out if identifier is email or username
#     username = payload.identifier
#     if "@" in username:
#         try:
#             user_obj = User.objects.get(email__iexact=username)
#             username = user_obj.username   # convert email -> username
#         except User.DoesNotExist:
#             return {"ok": False, "message": "Invalid credentials"}

#     # STEP 2: check credentials
#     user = authenticate(request, username=username, password=payload.password)
#     if not user:
#         return {"ok": False, "message": "Invalid credentials"}

#     # STEP 3: create session
#     login(request, user)

#     # STEP 4: return profile info
#     profile, _ = UserProfile.objects.get_or_create(user=user)
#     return {
#         "ok": True,
#         "message": "Logged in",
#         "user": {
#             "u_id": str(profile.u_id),
#             "display_name": profile.display_name,
#             "contact_email": profile.contact_email,
#             "is_verified": profile.is_verified,
#         }
#     }

# @api.post("/auth/logout")
# def logout_view(request):
#     if request.user.is_authenticated:
#         logout(request)
#         return {"ok": True, "message": "Logged out"}
#     return {"ok": True, "message": "Already logged out"}

# @api.get("/auth/me", response=ProfileOut, auth=JWTAuth())
# def me_view(request):
#     profile, _ = UserProfile.objects.get_or_create(user=request.auth)
#     return profile