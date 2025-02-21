from rest_framework import serializers
from mainapp.models.event import Event
from django.utils import timezone

class EventSerializer(serializers.ModelSerializer):
    stadium_name = serializers.CharField(source="stadium.name", read_only=True)
    team_home_name = serializers.CharField(source="team_home.name", read_only=True)
    team_away_name = serializers.CharField(source="team_away.name", read_only=True)
    is_finished = serializers.SerializerMethodField()
    match_status = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = ['id', 'stadium_name', 'team_home_name', 'team_away_name', 'start', 'score', 'is_finished', 'match_status', 'winner_id']

    def get_is_finished(self, obj):
        # Vérifions d'abord si le score existe
        if obj.score is None:
            return False
            
        # Si le score est "0 - 0" et pas de vainqueur, le match n'est pas terminé
        if obj.score == "0 - 0" and obj.winner_id is None:
            return False
            
        # Dans tous les autres cas (score différent de 0-0 ou présence d'un vainqueur), le match est terminé
        return True

    def get_match_status(self, obj):
        # Si pas de score, le match n'a pas commencé
        if obj.score is None:
            return "À venir"
        
        # Si score 0-0 sans vainqueur, le match n'a pas commencé
        if obj.score == "0 - 0" and obj.winner_id is None:
            return "À venir"
        
        # Si pas de vainqueur mais score différent de 0-0, c'est un match nul
        if obj.winner_id is None:
            return "Match nul"
            
        # Si il y a un vainqueur
        winner_team = obj.team_home if obj.winner_id == obj.team_home_id else obj.team_away
        return f"Victoire {winner_team.name}" if winner_team else "Match terminé"