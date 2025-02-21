from django.urls import path
from django.contrib.auth import views as auth_views
from .views.api import (
    list_matches, 
    match_detail
)
from .views.api_auth import (
    register_user,
    login_user,
    logout_user
)
from .views.api_tickets import (
    list_user_tickets,
    buy_ticket,
    verify_ticket
)
from .views import custom_login, admin_dashboard, update_event

urlpatterns = [
    # URLs d'administration existantes
    path("", custom_login, name="login"),  # Page de login par défaut
    path("admin/dashboard/", admin_dashboard, name="admin_dashboard"),
    path("admin/update_event/<int:event_id>/", update_event, name="update_event"),
    path("admin/logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),

    # URLs d'API
    path("api/matches/", list_matches, name="list_matches"),
    path("api/matches/<int:match_id>/", match_detail, name="match_detail"),
    
    # Routes d'authentification API
    path("api/register/", register_user, name="register"),
    path("api/login/", login_user, name="login_api"),
    path("api/logout/", logout_user, name="api_logout"),
    
    # Routes des tickets API
    path("api/tickets/", list_user_tickets, name="list_tickets"),
    path("api/tickets/buy/", buy_ticket, name="buy_ticket"),
    path("api/tickets/verify/<str:ticket_id>/", verify_ticket, name="verify_ticket"),
]