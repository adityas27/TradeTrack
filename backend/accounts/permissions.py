from rest_framework.permissions import BasePermission

class NotBanned(BasePermission):
    message = "Your account has been banned. Please contact support."

    def has_permission(self, request, view):
        return request.user.is_authenticated and not request.user.is_banned