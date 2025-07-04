from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser
from django.utils.html import format_html

@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    model = CustomUser

    list_display = (
        'username', 'email', 'first_name', 'last_name',
        'is_staff', 'is_verified', 'is_banned', 'joined_at', 'show_profile_image'
    )
    list_filter = ('is_staff', 'is_verified', 'is_banned', 'joined_at')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone_number')
    ordering = ('-joined_at',)
    readonly_fields = ('joined_at', 'last_login')

    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Personal Info', {
            'fields': (
                'first_name', 'last_name', 'profile_image', 'phone_number', 'date_of_birth'
            )
        }),
        ('Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'is_verified', 'is_banned', 'groups', 'user_permissions'
            )
        }),
        ('Important Dates', {'fields': ('joined_at', 'last_login')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username', 'email', 'password1', 'password2',
                'is_staff', 'is_verified', 'is_banned'
            ),
        }),
    )

    def show_profile_image(self, obj):
        if obj.profile_image:
            return format_html('<img src="{}" width="30" height="30" style="border-radius:50%;" />', obj.profile_image.url)
        return "-"
    show_profile_image.short_description = "Avatar"
