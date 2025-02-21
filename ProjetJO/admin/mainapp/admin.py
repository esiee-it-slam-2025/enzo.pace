from django.contrib import admin
from mainapp.models import Event

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("id", "team_home", "team_away", "stadium", "start", "score", "winner")
    list_editable = ("score", "winner")
    list_filter = ("stadium", "start")
    search_fields = ("team_home__name", "team_away__name")

