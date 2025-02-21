from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from mainapp.models.event import Event
from mainapp.models.ticket import Ticket
from django.core.exceptions import ValidationError
import uuid

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_tickets(request):
    """Récupère tous les billets de l'utilisateur connecté"""
    tickets = Ticket.objects.filter(user=request.user).select_related('match')
    tickets_data = []
    
    for ticket in tickets:
        tickets_data.append({
            'id': ticket.id,
            'match': {
                'team_home': ticket.match.team_home.name if ticket.match.team_home else "À déterminer",
                'team_away': ticket.match.team_away.name if ticket.match.team_away else "À déterminer",
                'stadium': ticket.match.stadium.name,
                'start': ticket.match.start,
            },
            'category': ticket.category,
            'price': str(ticket.price),
            'purchase_date': ticket.purchase_date,
            'qr_code_data': ticket.qr_code_data
        })
    
    return Response(tickets_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buy_ticket(request):
    """Achète un nouveau billet"""
    try:
        match_id = request.data.get('match_id')
        category = request.data.get('category')
        price = request.data.get('price')

        # Vérifier que tous les champs requis sont présents
        if not all([match_id, category, price]):
            return Response({
                "message": "Tous les champs sont requis"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Vérifier que la catégorie est valide
        if category not in [choice[0] for choice in Ticket.CATEGORY_CHOICES]:
            return Response({
                "message": "Catégorie de billet invalide"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Récupérer le match
        match = get_object_or_404(Event, id=match_id)

        # Créer le billet
        ticket = Ticket.objects.create(
            id=str(uuid.uuid4()),
            match=match,
            user=request.user,
            category=category,
            price=price
        )

        return Response({
            "message": "Billet acheté avec succès",
            "ticket": {
                "id": ticket.id,
                "match": {
                    "team_home": match.team_home.name if match.team_home else "À déterminer",
                    "team_away": match.team_away.name if match.team_away else "À déterminer",
                    "stadium": match.stadium.name,
                    "start": match.start
                },
                "category": ticket.category,
                "price": str(ticket.price),
                "qr_code_data": ticket.qr_code_data
            }
        }, status=status.HTTP_201_CREATED)

    except Event.DoesNotExist:
        return Response({
            "message": "Match non trouvé"
        }, status=status.HTTP_404_NOT_FOUND)
    except ValidationError as e:
        return Response({
            "message": str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            "message": f"Une erreur est survenue: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['GET'])
def verify_ticket(request, ticket_id):
    """Vérifie la validité d'un billet via son QR code"""
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        return Response({
            "valid": True,
            "ticket": {
                "id": ticket.id,
                "match": {
                    "team_home": ticket.match.team_home.name if ticket.match.team_home else "À déterminer",
                    "team_away": ticket.match.team_away.name if ticket.match.team_away else "À déterminer",
                    "stadium": ticket.match.stadium.name,
                    "start": ticket.match.start
                },
                "category": ticket.category,
                "user": ticket.user.username
            }
        })
    except Ticket.DoesNotExist:
        return Response({
            "valid": False,
            "message": "Billet invalide ou non trouvé"
        }, status=status.HTTP_404_NOT_FOUND)