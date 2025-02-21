from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from mainapp.models.event import Event
from .serializers import EventSerializer

@api_view(['GET'])
def list_matches(request):
    """Retourne la liste de tous les matchs disponibles"""
    matches = Event.objects.all().order_by('start')  # Trier par date
    serializer = EventSerializer(matches, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
def match_detail(request, match_id):
    """Retourne les détails d'un match spécifique"""
    try:
        match = Event.objects.get(id=match_id)
    except Event.DoesNotExist:
        return Response({"error": "Match non trouvé"}, status=status.HTTP_404_NOT_FOUND)

    serializer = EventSerializer(match)
    return Response(serializer.data, status=status.HTTP_200_OK)
