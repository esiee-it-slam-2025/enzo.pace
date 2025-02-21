from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from mainapp.models.event import Event
from mainapp.models.team import Team
from mainapp.models.stadium import Stadium

def custom_login(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect("admin_dashboard")
        else:
            messages.error(request, "Nom d'utilisateur ou mot de passe incorrect.")

    return render(request, "login.html")

@login_required
def admin_dashboard(request):
    events = Event.objects.all()
    teams = Team.objects.all()
    stadiums = Stadium.objects.all()
    return render(request, "admin_dashboard.html", {"events": events, "teams": teams, "stadiums": stadiums})

@login_required
def update_event(request, event_id):
    if request.method == "POST":
        event = Event.objects.get(id=event_id)

        # Mise à jour du stade
        stadium_id = request.POST.get("stadium")
        if stadium_id:
            event.stadium_id = stadium_id

        # Mise à jour des équipes
        team_home_id = request.POST.get("team_home")
        team_away_id = request.POST.get("team_away")
        if team_home_id and team_away_id:
            event.team_home_id = team_home_id
            event.team_away_id = team_away_id

        # Mise à jour de la date
        event_date = request.POST.get("start")
        if event_date:
            event.start = event_date

        # Mise à jour des scores
        score_home = request.POST.get("score_home")
        score_away = request.POST.get("score_away")

        if score_home.isdigit() and score_away.isdigit():
            score_home = int(score_home)
            score_away = int(score_away)
            event.score = f"{score_home} - {score_away}"

            # Déterminer le vainqueur
            if score_home > score_away:
                event.winner_id = team_home_id
            elif score_away > score_home:
                event.winner_id = team_away_id
            else:
                event.winner_id = None  # Match nul

        event.save()
        return JsonResponse({"status": "success", "message": "Match mis à jour !"})

    return JsonResponse({"status": "error", "message": "Méthode non autorisée"}, status=400)
