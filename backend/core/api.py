from ninja import NinjaAPI, Schema, ModelSchema
from .models import UserProfile
from typing import List, Optional
from pydantic import ConfigDict, field_validator
try:
    from pydantic import EmailStr as _EmailStr
except ImportError:  # pragma: no cover - fallback for limited environments
    EmailStr = str  # type: ignore
else:
    try:
        import email_validator  # noqa: F401
    except ImportError:  # pragma: no cover - fallback when email-validator missing
        EmailStr = str  # type: ignore
    else:
        EmailStr = _EmailStr  # type: ignore
from datetime import datetime, date
from .auth import create_access_token, JWTAuth
import uuid
from datetime import datetime
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.db import transaction, IntegrityError

api = NinjaAPI()
User = get_user_model()

# --------------- Schemas ---------------

class SignUpIn(Schema):
    first_name: str
    last_name: str
    username: str
    email: EmailStr
    password: str
    confirm_password: str
    date_of_birth: str | None = None # 'YYYY-MM-DD'
    gender: str | None = None #'male'|'female'|'prefer_not'

    @field_validator("password")
    @classmethod
    def strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class SignUpOut(Schema):
    ok: bool
    message: str

class LoginIn(Schema):
    email : EmailStr
    password: str

class tokenOut(Schema):
    ok: bool
    token: Optional[str] = None
    message: str

class ProfileOut(Schema):
    """
    Unified profile response : user core fields + profile extras
    """
    model_config = ConfigDict(from_attributes=True)  # allow model instances
    # profile
    u_id: uuid.UUID
    is_verified: bool
    created_at: datetime
    avatar_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    # user
    username: str
    email: Optional[str] = None
    is_staff: bool
    is_superuser: bool

class UserProfileSchema(ModelSchema):
    class Config:
        model = UserProfile
        model_fields = ['u_id', 'is_verified', 'created_at', 'avatar_url', 'date_of_birth', 'gender']
        
# --------------- Auth endpoints ---------------
@api.post("/auth/token", response=tokenOut)
def token_login(request, payload: LoginIn):
    # only accept email
    email = payload.email.strip().lower()
    try:
        user_obj = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return {"ok": False, "message": "Invalid credentials"}
    
    user = authenticate(request, username=user_obj.get_username(), password=payload.password)
    if not user:
        return {"ok": False, "message": "Invalid credentials"}
    
    token = create_access_token(user)
    return {"ok": True, "token": token, "message": "Login successful"}

@api.post("/auth/signup", response=SignUpOut)
@transaction.atomic
def signup(request, payload: SignUpIn):
    # basic checks
    if payload.password != payload.confirm_password:
        return {"ok": False, "message": "Passwords do not match"}
    
    # enforce uniqueness in code (case-insensitive)
    if User.objects.filter(username__iexact=payload.username).exists():
        return {"ok": False, "message": "Username already taken"}
    
    if User.objects.filter(email__iexact=str(payload.email)).exists():
        return {"ok": False, "message": "Email already in use"}
    
    # create user
    try:
        user = User.objects.create_user(
            username=payload.username,
            email=str(payload.email),
            password=payload.password,
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
        )
    except IntegrityError:
        # covers where a same-username user is created between the check and now
        return {"ok": False, "message": "Username already taken"}
    
    # create/update profile
    dob = None
    if payload.date_of_birth:
        try:
            dob = date.fromisoformat(payload.date_of_birth)
        except ValueError:
            parts = payload.date_of_birth.replace("-", "/").split("/")
            if len(parts) != 3:
                return {"ok": False, "message": "Date of birth must be in YYYY-MM-DD format."}

            try:
                if len(parts[0]) == 4:
                    year, month, day = map(int, parts)
                elif len(parts[2]) == 4:
                    day, month, year = map(int, parts)
                else:
                    raise ValueError
                dob = date(year, month, day)
            except ValueError:
                return {"ok": False, "message": "Date of birth must be in YYYY-MM-DD format."}
    gender_choice = None
    if payload.gender and payload.gender in dict(UserProfile.Gender.choices):
        gender_choice = payload.gender
    
    UserProfile.objects.get_or_create(
        user=user,
        defaults=dict(
            date_of_birth=dob,
            gender=gender_choice
        ),
    )
    return {"ok": True, "message": "Signup successful"}

@api.post("/auth/logout", response=tokenOut, auth=JWTAuth())
def token_logout(request):
    # Stateless JWT: nothing to revoke on the server by default
    # Client should delete stored token
    return {"ok": True, "token": None, "message": "Logged out (token discarded client-side)"}

@api.get("/auth/me", response=ProfileOut, auth=JWTAuth())
def me_view(request):
    # request.auth is the authenticated User object (from JWTAuth)
    user: User = request.auth
    profile, _ = UserProfile.objects.select_related("user").get_or_create(user=user)
    # merge profile + user fields
    return {
        "u_id": profile.u_id,
        "is_verified": profile.is_verified,
        "created_at": profile.created_at,
        "avatar_url": profile.avatar_url,
        "date_of_birth": profile.date_of_birth,
        "gender": profile.gender,
        "username": user.get_username(),
        "email": user.email,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }

@api.get("/users", response=List[ProfileOut], auth=JWTAuth())
def list_users(request, limit: int = 50, offset: int = 0):
    qs = (UserProfile.objects
          .select_related("user")
          .order_by("created_at")[offset:offset+limit])
    return [
        {
            "u_id": p.u_id,
            "is_verified": p.is_verified,
            "created_at": p.created_at,
            "avatar_url": p.avatar_url,
            "date_of_birth": p.date_of_birth,
            "gender": p.gender,
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
