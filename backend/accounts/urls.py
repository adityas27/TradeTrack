from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import SignupView, ProfileView, PublicUserProfileView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('me/', ProfileView.as_view(), name='user-profile'),
    path('me/update/', ProfileView.as_view(), name='update-profile'),  # same view handles GET and PATCH
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/<str:username>/', PublicUserProfileView.as_view(), name='public-user-profile'),
]
